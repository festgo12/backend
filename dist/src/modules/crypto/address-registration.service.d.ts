import { HttpService } from '@nestjs/axios';
import { Chain, CryptoConfigService } from './crypto-config.service';
export declare class AddressRegistrationService {
    private readonly httpService;
    private readonly config;
    private readonly logger;
    private readonly queues;
    private static readonly BATCH_SIZE;
    private static readonly FLUSH_DELAY_MS;
    constructor(httpService: HttpService, config: CryptoConfigService);
    private queueFor;
    queueChainAddress(chain: Chain, address: string): void;
    private scheduleFlush;
    private flushChainAddresses;
    private registerChainAddressesWithAlchemy;
    replaceAllChainAddresses(chain: Chain, addresses: string[], authToken?: string | null, webhookId?: string | null): Promise<void>;
    registerAddress(address: string, chain: Chain | 'BTC'): void;
    queueEvmAddress(address: string): void;
    replaceAllEvmAddresses(addresses: string[]): Promise<void>;
}
