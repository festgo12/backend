"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ChainClientService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChainClientService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const ethers_1 = require("ethers");
const bitcoin = __importStar(require("bitcoinjs-lib"));
const client_1 = require("../../generated/client/index.js");
const crypto_config_service_1 = require("./crypto-config.service");
const hd_wallet_service_1 = require("./hd-wallet.service");
const ERC20_ABI = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address owner) view returns (uint256)',
];
let ChainClientService = ChainClientService_1 = class ChainClientService {
    httpService;
    config;
    hdWallet;
    logger = new common_1.Logger(ChainClientService_1.name);
    providerInstance = null;
    constructor(httpService, config, hdWallet) {
        this.httpService = httpService;
        this.config = config;
        this.hdWallet = hdWallet;
    }
    get provider() {
        const url = this.config.alchemyEthHttpUrl;
        if (!url) {
            throw new common_1.InternalServerErrorException('ALCHEMY_ETH_HTTP_URL is not configured');
        }
        if (!this.providerInstance) {
            this.providerInstance = new ethers_1.JsonRpcProvider(url);
        }
        return this.providerInstance;
    }
    get btcRpcUrl() {
        const url = this.config.quicknodeRpcUrl;
        if (!url) {
            throw new common_1.InternalServerErrorException('QUICKNODE_RPC_URL is not configured');
        }
        return url;
    }
    get btcNetwork() {
        return this.config.isTestnet
            ? bitcoin.networks.testnet
            : bitcoin.networks.bitcoin;
    }
    async btcRpcCall(method, params = []) {
        const res = await (0, rxjs_1.lastValueFrom)(this.httpService.post(this.btcRpcUrl, { jsonrpc: '2.0', id: 1, method, params }, { timeout: 15_000, headers: { 'Content-Type': 'application/json' } }));
        if (res.data.error) {
            throw new Error(`Bitcoin RPC ${method} failed: ${res.data.error.message} (code ${res.data.error.code})`);
        }
        return res.data.result;
    }
    async getLatestEvmBlock() {
        return this.provider.getBlockNumber();
    }
    async getEvmBlockHash(blockNumber) {
        const block = await this.provider.getBlock(blockNumber);
        return block ? block.hash : null;
    }
    async getEvmReceipt(txHash) {
        const receipt = await this.provider.getTransactionReceipt(txHash);
        if (!receipt)
            return null;
        return { blockNumber: receipt.blockNumber, status: receipt.status };
    }
    async getEvmBalance(address, currency) {
        if (currency === client_1.Currency.ETH) {
            return Number((0, ethers_1.formatEther)(await this.provider.getBalance(address)));
        }
        const contract = this.config.getStablecoinContract(currency);
        if (!contract)
            return 0;
        const token = new ethers_1.Contract(contract, ERC20_ABI, this.provider);
        const raw = (await token.balanceOf(address));
        return Number((0, ethers_1.formatUnits)(raw, this.decimalsFor(currency)));
    }
    async getAssetTransfers(provider, params) {
        const { fromBlock, toBlock, categories = ['external', 'erc20'] } = params;
        const toAddresses = params.toAddresses.map((a) => a.toLowerCase());
        try {
            return await this.fetchAssetTransfers(provider, fromBlock, toBlock, toAddresses, categories);
        }
        catch (error) {
            const err = error;
            this.logger.warn(`alchemy_getAssetTransfers array query failed (${err.message}); falling back to per-address queries`);
            const all = [];
            for (const address of toAddresses) {
                all.push(...(await this.fetchAssetTransfers(provider, fromBlock, toBlock, [address], categories)));
            }
            return all;
        }
    }
    async fetchAssetTransfers(provider, fromBlock, toBlock, toAddresses, categories) {
        const transfers = [];
        let pageKey;
        do {
            const request = {
                fromBlock: `0x${fromBlock.toString(16)}`,
                toBlock: `0x${toBlock.toString(16)}`,
                toAddress: toAddresses,
                category: categories,
                order: 'asc',
                maxCount: '0x3e8',
            };
            if (pageKey)
                request.pageKey = pageKey;
            const result = (await provider.send('alchemy_getAssetTransfers', [
                request,
            ]));
            const items = Array.isArray(result?.transfers) ? result.transfers : [];
            for (const t of items) {
                const category = t.category ?? '';
                const blockNumber = parseInt(t.blockNum ?? '', 16);
                if (!Number.isFinite(blockNumber))
                    continue;
                const raw = BigInt(t.value ?? '0');
                const amount = category === 'external'
                    ? Number(raw) / 1e18
                    : Number(raw) /
                        10 **
                            (t.rawContract?.decimal ? Number(t.rawContract.decimal) : 6);
                transfers.push({
                    category,
                    from: (t.from ?? '').toLowerCase(),
                    to: (t.to ?? '').toLowerCase(),
                    value: t.value ?? '0',
                    amount,
                    asset: t.asset ?? '',
                    hash: t.hash ?? '',
                    blockNumber,
                });
            }
            pageKey = result?.pageKey;
        } while (pageKey && transfers.length < 10_000);
        return transfers;
    }
    async getBtcTipHeight() {
        const height = await this.btcRpcCall('getblockcount');
        if (!Number.isFinite(height)) {
            throw new Error(`QuickNode getblockcount returned non-numeric value: "${String(height)}"`);
        }
        return height;
    }
    async getBtcTxStatus(txid) {
        try {
            const tx = await this.btcRpcCall('getrawtransaction', [txid, true]);
            if (tx.error) {
                return { confirmed: false, blockHeight: null, error: tx.error };
            }
            if (tx.confirmations && tx.confirmations > 0) {
                return {
                    confirmed: true,
                    blockHeight: tx.blockheight ?? null,
                };
            }
            return { confirmed: false, blockHeight: null };
        }
        catch (error) {
            const err = error;
            return { confirmed: false, blockHeight: null, error: err.message };
        }
    }
    async getBtcRecommendedFee() {
        try {
            const result = await this.btcRpcCall('estimatesmartfee', [6]);
            if (result.feerate && result.feerate > 0) {
                return Math.ceil(result.feerate * 100);
            }
            return 2;
        }
        catch (error) {
            const err = error;
            this.logger.warn(`BTC fee estimate failed (${err.message}); using 2 sat/vB`);
            return 2;
        }
    }
    async getBtcUtxos(address) {
        const utxos = await this.btcRpcCall('listunspent', [1, 9999999, [address]]);
        return utxos
            .filter((u) => u.confirmations > 0)
            .map((u) => ({
            txid: u.txid,
            vout: u.vout,
            value: Math.round(u.amount * 1e8),
            blockHeight: u.blockheight ?? 0,
        }));
    }
    async broadcastEvmNative(fromIndex, to, amount) {
        const signer = this.evmSigner(fromIndex);
        const tx = await signer.sendTransaction({
            to,
            value: (0, ethers_1.parseEther)(Number(amount).toFixed(18)),
        });
        this.logger.log(`ETH broadcast: ${amount} ${to} (TX: ${tx.hash})`);
        return tx.hash;
    }
    async broadcastEvmToken(currency, fromIndex, to, amount) {
        const contract = this.config.getStablecoinContract(currency);
        if (!contract) {
            throw new common_1.InternalServerErrorException(`No ${currency} contract configured for the active network`);
        }
        const decimals = this.decimalsFor(currency);
        const signer = this.evmSigner(fromIndex);
        const token = new ethers_1.Contract(contract, ERC20_ABI, signer);
        const tx = (await token.transfer(to, (0, ethers_1.parseUnits)(Number(amount).toFixed(decimals), decimals)));
        this.logger.log(`${currency} broadcast: ${amount} ${to} (TX: ${tx.hash})`);
        return tx.hash;
    }
    async broadcastBtc(fromIndex, to, amountBtc, feePerByte) {
        const valueSat = Math.floor(amountBtc * 1e8);
        const fromAddress = this.hdWallet.deriveAddress(client_1.Currency.BTC, fromIndex);
        const node = this.hdWallet.btcNode(fromIndex);
        const utxos = await this.getBtcUtxos(fromAddress);
        const selected = [];
        let total = 0;
        const sorted = [...utxos].sort((a, b) => b.value - a.value);
        for (const u of sorted) {
            selected.push(u);
            total += u.value;
            const fee = this.estimateBtcFee(selected.length, 2, feePerByte);
            if (total >= valueSat + fee)
                break;
        }
        const fee = this.estimateBtcFee(selected.length, 2, feePerByte);
        if (selected.length === 0 || total < valueSat + fee) {
            throw new common_1.InternalServerErrorException('Insufficient confirmed BTC balance (including network fee)');
        }
        const change = total - valueSat - fee;
        const psbt = new bitcoin.Psbt({ network: this.btcNetwork });
        const spendScript = bitcoin.payments.p2wpkh({
            pubkey: node.publicKey,
            network: this.btcNetwork,
        }).output;
        if (!spendScript) {
            throw new common_1.InternalServerErrorException('Failed to build BTC spend script');
        }
        for (const u of selected) {
            psbt.addInput({
                hash: Buffer.from(u.txid, 'hex'),
                index: u.vout,
                witnessUtxo: { script: spendScript, value: BigInt(u.value) },
            });
        }
        psbt.addOutput({ address: to, value: BigInt(valueSat) });
        if (change >= 546) {
            psbt.addOutput({ address: fromAddress, value: BigInt(change) });
        }
        for (let i = 0; i < selected.length; i++) {
            psbt.signInput(i, node);
        }
        psbt.finalizeAllInputs();
        const tx = psbt.extractTransaction();
        const rawHex = tx.toHex();
        const txid = await this.btcRpcCall('sendrawtransaction', [
            rawHex,
            0.1,
        ]);
        this.logger.log(`BTC broadcast: ${amountBtc} ${to} (TX: ${txid})`);
        return txid;
    }
    evmSigner(fromIndex) {
        const pk = this.hdWallet.derivePrivateKey(client_1.Currency.ETH, fromIndex);
        return new ethers_1.Wallet(pk, this.provider);
    }
    decimalsFor(currency) {
        return currency === client_1.Currency.ETH ? 18 : 6;
    }
    estimateBtcFee(inputs, outputs, feePerByte) {
        const size = 10 + 68 * inputs + 31 * outputs;
        return Math.max(1, Math.round(size * feePerByte));
    }
    chainKind(currency) {
        return this.hdWallet.chainForCurrency(currency);
    }
};
exports.ChainClientService = ChainClientService;
exports.ChainClientService = ChainClientService = ChainClientService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        crypto_config_service_1.CryptoConfigService,
        hd_wallet_service_1.HdWalletService])
], ChainClientService);
//# sourceMappingURL=chain-client.service.js.map