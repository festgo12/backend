"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chainValuesForCurrency = chainValuesForCurrency;
exports.isFiatCurrency = isFiatCurrency;
exports.primaryWalletWhere = primaryWalletWhere;
const client_1 = require("../../generated/client/index.js");
function chainValuesForCurrency(currency) {
    switch (currency) {
        case client_1.Currency.NGN:
            return null;
        case client_1.Currency.BTC:
            return ['BTC'];
        case client_1.Currency.ETH:
            return ['EVM', 'ETH'];
        case client_1.Currency.USDT:
        case client_1.Currency.USDC:
            return ['EVM', 'ETH', 'BSC', 'POLYGON', 'SOLANA', 'TRON'];
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
//# sourceMappingURL=wallet-query.util.js.map