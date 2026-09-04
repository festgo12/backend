/**
 * Jest-only stub for @solana/spl-token.
 * See test/mocks/solana-web3.ts for rationale.
 */

const TOKEN_PROGRAM_ID = {
  toString: () => 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
};
const ASSOCIATED_TOKEN_PROGRAM_ID = {
  toString: () => 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
};

module.exports = {
  getAssociatedTokenAddress: jest.fn(async () => ASSOCIATED_TOKEN_PROGRAM_ID),
  createAssociatedTokenAccountInstruction: jest.fn(),
  createTransferInstruction: jest.fn(),
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
};