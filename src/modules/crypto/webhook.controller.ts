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
 * Webhook receiver for crypto deposit and withdrawal notifications.
 *
 * - POST /api/v1/webhooks/alchemy  — Alchemy Address Activity (EVM)
 *
 * BTC deposits arrive via Alchemy WebSocket (BtcAlchemyWebSocketService),
 * not via an HTTP webhook.
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
      this.logger.error(
        'ALCHEMY_SIGNING_KEY not configured; rejecting Alchemy webhook (fail-closed)',
      );
      return false;
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
}
