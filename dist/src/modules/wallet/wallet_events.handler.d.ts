import { WalletService } from './wallet.service';
export declare class WalletEventsHandler {
    private readonly walletService;
    constructor(walletService: WalletService);
    handleUserCreated(payload: {
        userId: string;
        email?: string;
    }): Promise<void>;
}
