import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { WalletTransactionEvent } from './wallet.service';

@Injectable()
export class WalletNotificationsHandler {
  private readonly logger = new Logger(WalletNotificationsHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @OnEvent('wallet.deposit.confirmed')
  async onDepositConfirmed(event: WalletTransactionEvent) {
    const ctx = await this.resolveContext(event.walletId);
    if (!ctx) return;
    await this.notify(ctx.userId, 'DEPOSIT_CREDITED', {
      amount: String(event.amount),
      currency: ctx.currency,
      reference: event.reference,
    });
  }

  @OnEvent('wallet.withdrawal.initiated')
  async onWithdrawalInitiated(event: WalletTransactionEvent) {
    const ctx = await this.resolveContext(event.walletId);
    if (!ctx) return;
    await this.notify(ctx.userId, 'WITHDRAWAL_REQUESTED', {
      amount: String(event.amount),
      currency: ctx.currency,
      reference: event.reference,
    });
  }

  @OnEvent('wallet.withdrawal.confirmed')
  async onWithdrawalConfirmed(event: WalletTransactionEvent) {
    const ctx = await this.resolveContext(event.walletId);
    if (!ctx) return;
    await this.notify(ctx.userId, 'WITHDRAWAL_COMPLETED', {
      amount: String(event.amount),
      currency: ctx.currency,
      reference: event.reference,
    });
  }

  @OnEvent('wallet.withdrawal.failed')
  async onWithdrawalFailed(event: WalletTransactionEvent) {
    const ctx = await this.resolveContext(event.walletId);
    if (!ctx) return;
    await this.notify(ctx.userId, 'WITHDRAWAL_FAILED', {
      amount: String(event.amount),
      currency: ctx.currency,
      reference: event.reference,
    });
  }

  private async resolveContext(walletId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
      select: { userId: true, currency: true },
    });
    if (!wallet) {
      this.logger.warn(`Notification skipped: wallet ${walletId} not found`);
      return null;
    }
    return { userId: wallet.userId, currency: wallet.currency };
  }

  private async notify(userId: string, type: string, data: Record<string, string>) {
    try {
      await this.notifications.notifyUser({ userId, type, data });
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to send ${type} notification to ${userId}: ${err.message}`);
    }
  }
}