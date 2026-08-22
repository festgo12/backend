import { HttpService } from '@nestjs/axios';
import { CryptoConfigService } from './crypto-config.service';
import { ChainKind } from './crypto-config.service';
export declare class AddressRegistrationService {
    private readonly httpService;
    private readonly config;
    private readonly logger;
    private pendingEvmAddresses;
    private evmFlushTimer;
    private static readonly EVM_BATCH_SIZE;
    private static readonly EVM_FLUSH_DELAY_MS;
    constructor(httpService: HttpService, config: CryptoConfigService);
    queueEvmAddress(address: string): void;
    private scheduleFlush;
    private flushEvmAddresses;
    private registerEvmAddressesWithAlchemy;
    replaceAllEvmAddresses(addresses: string[]): Promise<void>;
    registerAddress(address: string, chain: ChainKind): void;
}
