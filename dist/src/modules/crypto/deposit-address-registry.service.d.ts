import { OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { ChainKind } from './crypto-config.service';
export interface AddressRegistration {
    chain: ChainKind;
    walletId: string;
}
export declare class DepositAddressRegistry implements OnApplicationBootstrap {
    private readonly prisma;
    private readonly logger;
    private readonly addresses;
    constructor(prisma: PrismaService);
    onApplicationBootstrap(): Promise<void>;
    rebuild(): Promise<void>;
    register(address: string, chain: ChainKind, walletId: string): void;
    private add;
    unregister(address: string, chain: ChainKind, walletId: string): void;
    lookup(address: string, chain: ChainKind): AddressRegistration[];
    has(address: string, chain: ChainKind): boolean;
    addressesForChain(chain: ChainKind): string[];
    get size(): number;
    private keyFor;
    private guessChain;
}
