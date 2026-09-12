"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVM_WALLET_CHAINS = void 0;
exports.chainValuesForCurrency = chainValuesForCurrency;
exports.isFiatCurrency = isFiatCurrency;
exports.primaryWalletWhere = primaryWalletWhere;
exports.chainValuesForCurrencyChain = chainValuesForCurrencyChain;
exports.chainWalletWhere = chainWalletWhere;
exports.resolveChainWallet = resolveChainWallet;
const client_1 = require("../../generated/client/index.js");
exports.EVM_WALLET_CHAINS = ['ETH', 'BSC', 'POLYGON'];
function chainValuesForCurrency(currency) {
    switch (currency) {
        case client_1.Currency.NGN:
            return null;
        case client_1.Currency.BTC:
            return ['BTC'];
        case client_1.Currency.ETH:
            return ['ETH'];
        case client_1.Currency.USDT:
        case client_1.Currency.USDC:
            return ['ETH', 'BSC', 'POLYGON', 'SOLANA', 'TRON'];
        default:
            return [];
    }
}
function isFiatCurrency(currency) {
    return currency === client_1.Currency.NGN;
}
function primaryWalletWhere(userId, currency) {
    const chains = chainValuesForCurrency(currency);
    if (chains === null) {
        return { userId, currency, chain: null };
    }
    return { userId, currency, chain: { in: chains } };
}
function chainValuesForCurrencyChain(currency, chain) {
    if (currency === client_1.Currency.NGN)
        return null;
    const c = chain ?? undefined;
    if (!c)
        return chainValuesForCurrency(currency);
    if (currency === client_1.Currency.BTC)
        return ['BTC'];
    if (c === 'EVM')
        return ['ETH'];
    return [c];
}
function chainWalletWhere(userId, currency, chain) {
    const chains = chainValuesForCurrencyChain(currency, chain);
    if (chains === null) {
        return { userId, currency, chain: null };
    }
    return { userId, currency, chain: { in: chains } };
}
async function resolveChainWallet(walletFindFirst, userId, currency, chain) {
    const chains = chainValuesForCurrencyChain(currency, chain);
    if (chains === null) {
        return walletFindFirst({ userId, currency, chain: null });
    }
    for (const c of chains) {
        const found = await walletFindFirst({ userId, currency, chain: c });
        if (found)
            return found;
    }
    return null;
}
//# sourceMappingURL=wallet-query.util.js.map