import { OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { ChainFamily, CryptoConfigService } from './crypto-config.service';
import { AddressRegistrationService } from './address-registration.service';
export interface AddressRegistration {
    chain: ChainFamily;
    walletId: string;
}
export declare class DepositAddressRegistry implements OnApplicationBootstrap {
    private readonly prisma;
    private readonly addressRegistration;
    private readonly config;
    private readonly logger;
    private readonly addresses;
    constructor(prisma: PrismaService, addressRegistration: AddressRegistrationService, config: CryptoConfigService);
    onApplicationBootstrap(): Promise<void>;
    rebuild(): Promise<void>;
    private bootSyncAllChains;
    private pushChainSnapshot;
    register(address: string, chain: string, walletId: string): void;
    private add;
    unregister(address: string, chain: string, walletId: string): void;
    lookup(address: string, chain: string): AddressRegistration[];
    has(address: string, chain: string): boolean;
    addressesForChain(chain: string): string[];
    private addressesForFamily;
    get size(): number;
    private keyFor;
    private familyForChainValue;
    private canonicalChainForFamily;
}
