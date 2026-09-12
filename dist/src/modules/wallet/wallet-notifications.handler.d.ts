import { PrismaService } from '../../core/database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { WalletTransactionEvent } from './wallet.service';
export declare class WalletNotificationsHandler {
    private readonly prisma;
    private readonly notifications;
    private readonly logger;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    onDepositConfirmed(event: WalletTransactionEvent): Promise<void>;
    onWithdrawalInitiated(event: WalletTransactionEvent): Promise<void>;
    onWithdrawalConfirmed(event: WalletTransactionEvent): Promise<void>;
    onWithdrawalFailed(event: WalletTransactionEvent): Promise<void>;
    private resolveContext;
    private notify;
}
