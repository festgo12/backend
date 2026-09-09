import {
  Controller,
  Post,
  Headers,
  Body,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { GiftCardStoreService } from './gift-card-store.service';
import type { ReloadlyWebhook } from './reloadly.client';
import * as crypto from 'crypto';

@ApiTags('Gift Card Store Webhook')
@Controller('gift-card-store/webhook')
export class GiftCardStoreWebhookController {
  private readonly logger = new Logger(GiftCardStoreWebhookController.name);

  constructor(
    private readonly storeService: GiftCardStoreService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Reloadly order event webhook' })
  async handleWebhook(
    @Headers('authorization') authorization: string,
    @Body() payload: ReloadlyWebhook,
  ) {
    this.verifySignature(authorization);

    const result = await this.storeService.resolveOrder(payload);
    this.logger.log(
      `Reloadly webhook processed: matched=${result.matched}, order=${result.orderId}`,
    );

    return { received: true, ...result };
  }

  private verifySignature(authorization?: string): void {
    const secret =
      this.configService.get<string>('RELOADLY_WEBHOOK_SECRET') || '';
    if (!secret) {
      this.logger.warn(
        'RELOADLY_WEBHOOK_SECRET not configured; rejecting webhook (fail-closed)',
      );
      throw new UnauthorizedException('Webhook secret not configured');
    }

    const provided = authorization?.replace(/^Bearer\s+/i, '').trim() || '';
    if (!provided) {
      throw new UnauthorizedException('Missing webhook authorization');
    }

    const expected = Buffer.from(secret, 'utf8');
    const actual = Buffer.from(provided, 'utf8');

    const safe =
      expected.length === actual.length &&
      crypto.timingSafeEqual(expected, actual);

    if (!safe) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }
}
