import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
export declare class TatumDepositService {
    private readonly prisma;
    private readonly walletService;
    private readonly logger;
    constructor(prisma: PrismaService, walletService: WalletService);
    handleDepositNotification(payload: {
        address: String;
        amount: string;
        asset: string;
        txId: string;
        reference?: string;
    }): Promise<void>;
    syncBalanceWithBlockchain(walletId: string): Promise<void>;
}
