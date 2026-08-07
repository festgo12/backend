import { HDNodeWallet } from 'ethers';
import { BIP32Interface } from 'bip32';
import { Currency } from '@src/generated/client';
import { PrismaService } from '../../core/database/prisma.service';
import { ChainKind, CryptoConfigService } from './crypto-config.service';
export interface DepositAddressInfo {
    chain: ChainKind;
    address: string;
    derivationIndex: number;
}
export declare const MASTER_WALLET_INDEX = 0;
export declare const USER_INDEX_BASE = 1000;
export declare const USER_INDEX_SPACE = 2000000;
export declare class HdWalletService {
    private readonly prisma;
    private readonly config;
    private readonly logger;
    constructor(prisma: PrismaService, config: CryptoConfigService);
    chainForCurrency(currency: Currency): ChainKind | null;
    isCryptoCurrency(currency: Currency): boolean;
    indexForUser(userId: string): number;
    getOrAssignDepositInfo(userId: string, currency: Currency): Promise<DepositAddressInfo>;
    deriveAddress(currency: Currency, index: number): string;
    getMasterAddress(chain: ChainKind): string;
    derivePrivateKey(currency: Currency, index: number): string;
    evmNode(index: number): HDNodeWallet;
    btcNode(index: number): BIP32Interface;
    private deriveEvmAddress;
    private deriveBtcAddress;
    private get btcNetwork();
}
