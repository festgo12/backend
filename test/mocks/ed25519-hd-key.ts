/**
 * Jest-only stub for ed25519-hd-key (an ESM-only package jest can't parse).
 * See test/mocks/solana-web3.ts for rationale.
 */

module.exports = {
  derivePath: jest.fn(() => ({ key: Buffer.alloc(32, 1) })),
  getMasterKeyFromSeed: jest.fn(),
  CKDPriv: jest.fn(),
  getPublicKey: jest.fn(),
  isValidPath: jest.fn(() => true),
};