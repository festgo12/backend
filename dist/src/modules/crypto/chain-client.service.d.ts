import { HttpService } from '@nestjs/axios';
import { JsonRpcProvider } from 'ethers';
import { Currency } from '@src/generated/client';
import { CryptoConfigService, ChainKind } from './crypto-config.service';
import { HdWalletService } from './hd-wallet.service';
export interface EvmReceipt {
    blockNumber: number;
    status: number | null;
}
export interface BtcUtxo {
    txid: string;
    vout: number;
    value: number;
    blockHeight: number;
}
export interface BtcTxStatus {
    confirmed: boolean;
    blockHeight: number | null;
    error?: string;
}
export declare class ChainClientService {
    private readonly httpService;
    private readonly config;
    private readonly hdWallet;
    private readonly logger;
    private providerInstance;
    constructor(httpService: HttpService, config: CryptoConfigService, hdWallet: HdWalletService);
    get provider(): JsonRpcProvider;
    private get btcApiBase();
    private get btcNetwork();
    getLatestEvmBlock(): Promise<number>;
    getEvmBlockHash(blockNumber: number): Promise<string | null>;
    getEvmReceipt(txHash: string): Promise<EvmReceipt | null>;
    getEvmBalance(address: string, currency: Currency): Promise<number>;
    getBtcTipHeight(): Promise<number>;
    getBtcUtxos(address: string): Promise<BtcUtxo[]>;
    getBtcTx(txid: string): Promise<BtcTxStatus>;
    getBtcRecommendedFee(): Promise<number>;
    broadcastEvmNative(fromIndex: number, to: string, amount: number): Promise<string>;
    broadcastEvmToken(currency: Currency, fromIndex: number, to: string, amount: number): Promise<string>;
    broadcastBtc(fromIndex: number, to: string, amountBtc: number, feePerByte: number): Promise<string>;
    private evmSigner;
    private decimalsFor;
    private estimateBtcFee;
    chainKind(currency: Currency): ChainKind | null;
}
