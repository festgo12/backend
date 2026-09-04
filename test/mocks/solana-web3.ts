/**
 * Jest-only stub for @solana/web3.js.
 *
 * The real package pulls in WebSocket/Buffer-heavy transitive deps whose
 * syntax jest's node transform cannot parse. Unit tests never exercise
 * Solana logic (they mock ChainClientService/HdWalletService), so these
 * minimal stand-ins only need to satisfy the static imports.
 */

class PublicKey {
  constructor(public base58: string) {}
  toBase58(): string {
    return this.base58;
  }
  toString(): string {
    return this.base58;
  }
}

class Connection {
  getBalance = jest.fn(async () => 0n);
  getLatestBlockhash = jest.fn(async () => ({
    blockhash: '11111111111111111111111111111111',
    lastValidBlockHeight: 0,
  }));
  getAccountInfo = jest.fn(async () => null);
  sendRawTransaction = jest.fn(async () => '');
  confirmTransaction = jest.fn(async () => {});
  getTokenAccountsByOwner = jest.fn(async () => ({ value: [] }));
}

class Transaction {
  add = jest.fn();
  sign = jest.fn();
  serialize = jest.fn(() => Buffer.alloc(0));
  feePayer: PublicKey | null = null;
  recentBlockhash: string | null = null;
}

module.exports = {
  PublicKey,
  Connection,
  Transaction,
  Keypair: { fromSeed: jest.fn() },
  SystemProgram: {
    transfer: jest.fn(),
    programId: new PublicKey('11111111111111111111111111111111'),
  },
  LAMPORTS_PER_SOL: 1_000_000_000,
  clusterApiUrl: jest.fn(() => 'https://api.devnet.solana.com'),
};