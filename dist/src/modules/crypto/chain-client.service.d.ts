import { HttpService } from '@nestjs/axios';
import { JsonRpcProvider } from 'ethers';
import { Currency } from '@src/generated/client';
import { ChainFamily, Chain, CryptoConfigService, ChainKind } from './crypto-config.service';
import { HdWalletService } from './hd-wallet.service';
export interface EvmReceipt {
    blockNumber: number;
    status: number | null;
}
export interface EvmAssetTransfer {
    category: string;
    from: string;
    to: string;
    value: string;
    amount: number;
    asset: string;
    hash: string;
    blockNumber: number;
}
export interface AssetTransfersParams {
    fromBlock: number;
    toBlock: number;
    toAddresses: string[];
    categories?: ('external' | 'erc20')[];
}
export interface TransferProvider {
    send(method: string, params: unknown[]): Promise<unknown>;
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
    private readonly evmProviders;
    private readonly solanaConnections;
    private readonly evmNonceLocks;
    constructor(httpService: HttpService, config: CryptoConfigService, hdWallet: HdWalletService);
    private withNonceLock;
    get provider(): JsonRpcProvider;
    providerForChain(chain: string): JsonRpcProvider;
    private solanaUrl;
    private solanaConnection;
    private tronRpc;
    tronAddressToHex(address: string): string;
    tronHexToAddress(hexAddress: string): string;
    private static readonly BALANCE_OF_SELECTOR;
    private static readonly TRC20_TRANSFER_SELECTOR;
    private static readonly TRC20_TRANSFER_TOPIC;
    chainFamily(chain: Chain): ChainFamily;
    private get btcRpcUrl();
    private get btcNetwork();
    private btcRpcCall;
    getLatestEvmBlock(): Promise<number>;
    getEvmBlockHash(blockNumber: number): Promise<string | null>;
    getEvmReceipt(txHash: string): Promise<EvmReceipt | null>;
    getEvmBalance(address: string, currency: Currency, chain?: string): Promise<number>;
    getAssetTransfers(provider: TransferProvider, params: AssetTransfersParams): Promise<EvmAssetTransfer[]>;
    private fetchAssetTransfers;
    getBtcTipHeight(): Promise<number>;
    getBtcTxStatus(txid: string): Promise<BtcTxStatus>;
    getBtcRecommendedFee(): Promise<number>;
    getBtcUtxos(address: string): Promise<BtcUtxo[]>;
    estimateTokenTransferGasCost(chain: string, fromAddress: string, currency: Currency): Promise<number>;
    getNativeGasBalance(chain: string, address: string): Promise<number>;
    private static readonly NATIVE_TRANSFER_GAS;
    estimateNativeTransferGasCost(chain: string, fromAddress: string): Promise<number>;
    estimateBtcSweepFee(address: string, feePerByte: number): Promise<number>;
    broadcastEvmNative(fromIndex: number, to: string, amount: number, chain?: string): Promise<string>;
    broadcastEvmToken(currency: Currency, fromIndex: number, to: string, amount: number, chain?: string): Promise<string>;
    getSolBalance(address: string): Promise<number>;
    getSolanaTokenBalance(mint: string, owner: string): Promise<number>;
    broadcastSolanaToken(currency: Currency, fromIndex: number, to: string, amount: number): Promise<string>;
    getSolanaSignatureStatuses(sig: string): Promise<number | null>;
    getTrxBalance(address: string): Promise<number>;
    getTronTokenBalance(contract: string, address: string): Promise<number>;
    private resolveTronContractHex;
    private tronEvmSigner;
    private sendTronEvmTx;
    broadcastTronToken(currency: Currency, fromIndex: number, to: string, amount: number): Promise<string>;
    broadcastTronNative(fromIndex: number, to: string, amountTrx: number): Promise<string>;
    getTronReceipt(txHash: string): Promise<{
        confirmed: boolean;
        blockNumber: number;
    } | null>;
    getSolanaTransfers(ownerAddress: string, mint: string, limit?: number): Promise<Array<{
        txHash: string;
        mint: string;
        amount: number;
        from: string | null;
        to: string | null;
        blockNumber: number | null;
        confirmed: boolean;
    }>>;
    getTronTransfers(address: string, contract: string, limit?: number): Promise<Array<{
        txHash: string;
        amount: number;
        from: string;
        to: string;
        blockNumber: number;
        tokenSymbol: string | null;
    }>>;
    fetchTronTransferLogs(contract: string, toAddresses: string[], maxLogs?: number, fromBlock?: number | 'latest'): Promise<Array<{
        txHash: string;
        amount: number;
        from: string;
        to: string;
        blockNumber: number;
        blockTimestampMs: number | null;
    }>>;
    broadcastBtc(fromIndex: number, to: string, amountBtc: number, feePerByte: number): Promise<string>;
    private evmSigner;
    private decimalsFor;
    private estimateBtcFee;
    chainKind(currency: Currency): ChainKind | null;
}
