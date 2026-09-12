import { ConfigService } from '@nestjs/config';
export declare class EncryptionService {
    private readonly config;
    private readonly key;
    constructor(config: ConfigService);
    encrypt(plaintext: string): string;
    decrypt(ciphertext: string): string;
}
