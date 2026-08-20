import type { Request, Response } from 'express';
import { CryptoConfigService } from './crypto-config.service';
import { WebhookProcessorService } from './webhook-processor.service';
interface RawBodyRequest extends Request {
    rawBody?: Buffer;
}
export declare class WebhookController {
    private readonly config;
    private readonly processor;
    private readonly logger;
    constructor(config: CryptoConfigService, processor: WebhookProcessorService);
    handleAlchemy(req: RawBodyRequest, res: Response): Promise<void>;
    private verifyAlchemySignature;
}
export {};
