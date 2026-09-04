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

    // 1. Parse payload (needed to route the webhook to its chain so we can
    //    pick the correct per-webhook signing key for verification).
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
    } catch {
      this.logger.warn('Alchemy webhook: invalid JSON payload');
      res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid JSON' });
      return;
    }

    // 2. Verify HMAC-SHA256 signature. Each Alchemy webhook signs with its own
    //    key, and Alchemy's per-chain `network` enum values vary, so we try the
    //    matched-chain key first (when resolvable) then fall back to every
    //    configured per-chain / global signing key.
    const signature = req.headers['x-alchemy-signature'] as string | undefined;
    const chain = this.processor.chainFromPayload(payload);
    if (!this.verifyAlchemySignature(rawBody, signature, chain)) {
      const network = this.processor.networkFromPayload(payload);
      this.logger.warn(
        `Alchemy webhook signature verification failed (chain=${chain ?? 'unknown'}, network=${network ?? 'unknown'})`,
      );
      res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Invalid signature' });
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
   *
   * Each Alchemy webhook signs with its own key, and the exact per-chain
   * `network` enum can vary. To stay correct regardless of chain resolution,
   * we try the matched chain's key first (when resolvable), then fall back to
   * every configured per-chain / global signing key. Fail-closed when none is
   * configured.
   */
  private verifyAlchemySignature(
    rawBody: Buffer,
    givenSignature: string | undefined,
    chain: string | null,
  ): boolean {
    if (!givenSignature) return false;

    const candidates = new Set<string>();
    if (chain) {
      const chainKey = this.config.signingKeyForChain(chain);
      if (chainKey) candidates.add(chainKey);
    }
    for (const key of this.config.allSigningKeys()) {
      if (key) candidates.add(key);
    }

    if (candidates.size === 0) {
      this.logger.error(
        'No Alchemy webhook signing key configured; rejecting webhook (fail-closed)',
      );
      return false;
    }

    for (const signingKey of candidates) {
      const digest = crypto
        .createHmac('sha256', signingKey)
        .update(rawBody)
        .digest('hex');
      try {
        if (
          crypto.timingSafeEqual(
            Buffer.from(givenSignature, 'utf8'),
            Buffer.from(digest, 'utf8'),
          )
        ) {
          return true;
        }
      } catch {
        // fall through to next candidate key
      }
    }
    return false;
  }
}
