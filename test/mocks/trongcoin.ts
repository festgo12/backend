/**
 * Jest-only stub for tronweb.
 * See test/mocks/solana-web3.ts for rationale.
 */

class TronWeb {
  public trx = {
    getBalance: jest.fn(async () => 0),
    sendToken: jest.fn(),
    signTransaction: jest.fn(),
  };
  public contract = jest.fn(() => ({ at: jest.fn() }));
  public defaultAddress: { hex?: string; base58?: string } = {};
  constructor(_options?: unknown) {}
}

module.exports = { TronWeb };