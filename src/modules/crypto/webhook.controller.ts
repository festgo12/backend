import { Controller, Post, Req, Res, Logger, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import * as crypto from 'crypto';
import { CryptoConfigService } from './crypto-config.service';
import { WebhookProcessorService } from './webhook-processor.service';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

/**
 * Unified webhook receiver for crypto deposit and withdrawal notifications.
 *
 * - POST /api/v1/webhooks/alchemy  — Alchemy Address Activity (EVM)
 * - POST /api/v1/webhooks/quicknode — QuickNode Streams (BTC)
 *
 * Both routes require the raw body for HMAC signature verification. The
 * raw body middleware in main.ts must be mounted on these paths BEFORE
 * NestJS's JSON parser.
 */
@ApiTags('Crypto Webhooks')
@Controller('api/v1/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly config: CryptoConfigService,
    private readonly processor: WebhookProcessorService,
  ) {}

  // ─── Alchemy Address Activity Webhook ────────────────────────────────────

  @Post('alchemy')
  @ApiOperation({ summary: 'Alchemy Address Activity Webhook receiver' })
  async handleAlchemy(
    @Req() req: RawBodyRequest,
    @Res() res: Response,
  ): Promise<void> {
    const rawBody = req.rawBody;
    if (!rawBody) {
      this.logger.warn('Alchemy webhook received without raw body');
      res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing raw body' });
      return;
    }

    // 1. Verify HMAC-SHA256 signature
    const signature = req.headers['x-alchemy-signature'] as string | undefined;
    if (!this.verifyAlchemySignature(rawBody, signature)) {
      this.logger.warn('Alchemy webhook signature verification failed');
      res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Invalid signature' });
      return;
    }

    // 2. Parse payload
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
    } catch {
      this.logger.warn('Alchemy webhook: invalid JSON payload');
      res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid JSON' });
      return;
    }

    // 3. Respond immediately — process async
    res.status(HttpStatus.OK).json({ received: true });

    // 4. Process the activity events
    try {
      await this.processor.processAlchemyEvent(payload);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Alchemy webhook processing failed: ${err.message}`);
    }
  }

  // ─── QuickNode Streams Webhook ──────────────────────────────────────────

  @Post('quicknode')
  @ApiOperation({ summary: 'QuickNode Streams Webhook receiver (BTC)' })
  async handleQuickNode(
    @Req() req: RawBodyRequest,
    @Res() res: Response,
  ): Promise<void> {
    const rawBody = req.rawBody;
    if (!rawBody) {
      this.logger.warn('QuickNode webhook received without raw body');
      res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing raw body' });
      return;
    }

    // 1. Verify HMAC-SHA256 signature: HMAC(key, nonce + timestamp + body)
    const nonce = req.headers['x-qn-nonce'] as string | undefined;
    const timestamp = req.headers['x-qn-timestamp'] as string | undefined;
    const signature = req.headers['x-qn-signature'] as string | undefined;

    if (!this.verifyQuickNodeSignature(rawBody, nonce, timestamp, signature)) {
      this.logger.warn('QuickNode webhook signature verification failed');
      res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Invalid signature' });
      return;
    }

    // 2. Parse payload
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
    } catch {
      this.logger.warn('QuickNode webhook: invalid JSON payload');
      res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid JSON' });
      return;
    }

    // 3. Respond immediately — process async
    res.status(HttpStatus.OK).json({ received: true });

    // 4. Process the BTC activity events
    try {
      await this.processor.processQuickNodeEvent(payload);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`QuickNode webhook processing failed: ${err.message}`);
    }
  }

  // ─── Signature Verification ─────────────────────────────────────────────

  /**
   * Alchemy: HMAC-SHA256(signingKey, rawBody) → compare to X-Alchemy-Signature.
   * The signature is a plain hex digest (no prefix).
   */
  private verifyAlchemySignature(
    rawBody: Buffer,
    givenSignature: string | undefined,
  ): boolean {
    const signingKey = this.config.alchemySigningKey;
    if (!signingKey) {
      this.logger.warn(
        'ALCHEMY_SIGNING_KEY not configured; skipping Alchemy signature verification',
      );
      return true;
    }
    if (!givenSignature) return false;

    const digest = crypto
      .createHmac('sha256', signingKey)
      .update(rawBody)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(givenSignature, 'utf8'),
        Buffer.from(digest, 'utf8'),
      );
    } catch {
      return false;
    }
  }

  /**
   * QuickNode: HMAC-SHA256(securityToken, nonce + timestamp + bodyString)
   * → compare to X-QN-Signature.
   */
  private verifyQuickNodeSignature(
    rawBody: Buffer,
    nonce: string | undefined,
    timestamp: string | undefined,
    givenSignature: string | undefined,
  ): boolean {
    const secret = this.config.quicknodeStreamsSecret;
    if (!secret) {
      this.logger.warn(
        'QN_STREAM_SECRET not configured; skipping QuickNode signature verification',
      );
      return true;
    }
    if (!nonce || !timestamp || !givenSignature) return false;

    const bodyString = rawBody.toString('utf8');
    const signatureData = nonce + timestamp + bodyString;

    const hmac = crypto
      .createHmac('sha256', Buffer.from(secret))
      .update(Buffer.from(signatureData))
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(hmac, 'hex'),
        Buffer.from(givenSignature, 'hex'),
      );
    } catch {
      return false;
    }
  }
}
