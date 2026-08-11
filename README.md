<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Environment variables

Copy `.env.example` to `.env` and fill in real values:

```bash
$ cp .env.example .env
```

### Crypto / blockchain (local-first, Alchemy)

The platform derives all deposit addresses locally from HD master seeds and
scans/pushes transactions via Alchemy + mempool.space — there is no third-party
wallet/wallet-service API.

| Key | Required | Default | Description |
| --- | --- | --- | --- |
| `CRYPTO_PROVIDER` | no | `alchemy` | Only `alchemy` is supported. |
| `ALCHEMY_NETWORK` | no | `sepolia` | `sepolia` or `mainnet`. Selects the ERC-20 contract defaults. |
| `ALCHEMY_ETH_WS_URL` | yes* | — | Alchemy WebSocket URL for the EVM network. |
| `ALCHEMY_ETH_HTTP_URL` | yes* | — | Alchemy HTTP URL for the EVM network (used for `alchemy_getAssetTransfers`, receipts, broadcasts). |
| `ALCHEMY_BTC_HTTP_URL` | yes* | — | Alchemy HTTP URL for Bitcoin (broadcast). |
| `MEMPOOL_API_URL` | no | network default | mempool.space base URL for BTC address scans. Defaults to `https://mempool.space/testnet/api` on testnet and `https://mempool.space/api` on mainnet; overrides the network default when set. |
| `HD_EVM_MASTER_MNEMONIC` | yes* | — | BIP-39 mnemonic for the EVM master wallet. Required for private-key derivation (signing). |
| `HD_BTC_MASTER_MNEMONIC` | yes* | — | BIP-39 mnemonic for the BTC master wallet. Required for signing. |
| `HD_EVM_MASTER_XPUB` | no | — | Optional read-only EVM xpub (not used for signing). |
| `HD_BTC_MASTER_XPUB` | no | — | Optional read-only BTC xpub (not used for signing). |
| `HD_EVM_DERIVATION_PATH` | no | `m/44'/60'/0'/0` | EVM derivation path prefix. |
| `HD_BTC_DERIVATION_PATH` | no | `m/84'/0'/0'/0` | BTC native-SegWit (bech32) derivation path prefix. |
| `HD_EVM_ACCOUNT` / `HD_BTC_ACCOUNT` | no | `0` | Account index within the derivation path. |
| `BLOCK_CONFIRMATIONS_ETH` | no | `12` | EVM confirmations before a deposit is credited. |
| `BLOCK_CONFIRMATIONS_BTC` | no | `2` | BTC confirmations before a deposit is credited. |
| `EVM_CATCH_UP_MAX_BLOCKS` | no | `50` | Max blocks the EVM catch-up re-scans after the WebSocket was down. |
| `EVM_CATCH_UP_MIN_INTERVAL_MS` | no | `60000` | Min delay between catch-up re-scans (reconnect-loop protection). |
| `EVM_ASSET_TRANSFER_BATCH_BLOCKS` | no | `5` | Flush the native-ETH batch scan once this many newHeads accumulate. |
| `EVM_ASSET_TRANSFER_BATCH_MAX_MS` | no | `30000` | Max time a partial batch is held before it is flushed. |
| `DEPOSIT_SWEEP_THRESHOLD` | no | `0` | Sweep fee-wallet funds to the master wallet once the balance reaches this amount. |
| `ALCHEMY_USDT_CONTRACT` / `ALCHEMY_USDC_CONTRACT` | no | network default | Override the ERC-20 contract address (only needed on non-default networks). |

\* Required at runtime for the corresponding chain to work. The API warns on
startup and keeps the app running when seeds are missing, but deposits,
withdrawals and sweeping for that chain will fail.

> **Security**: HD master mnemonics are signing material — keep them in `.env`
> (or a KMS), never in the database, logs, or committed files.

## Database (reset / seed)

The schema is managed with `prisma db push` (the crypto tables have no
migration files). Seed is idempotent and safe to re-run.

```bash
# Seed an existing database (super admin, platform fee wallets, fee configs)
$ npm run db:seed

# ⚠️ DESTRUCTIVE — drops and recreates the schema, then seeds it
$ npm run db:reset
```

`db:reset` is **destructive**: it wipes all data via
`prisma db push --force-reset` before re-seeding. Never run it against a
production database.

The seed creates:

1. A `SUPER_ADMIN` login — email/password from `SEED_ADMIN_EMAIL` /
   `SEED_ADMIN_PASSWORD` (defaults `admin@admin.com` / `Admin@12345!`), with a
   verified profile and default preferences.
2. The internal platform user and the BTC/ETH/USDT/USDC fee wallets via
   `PlatformService.ensurePlatformWallets()`, which also mirrors the HD master
   xpubs into `PlatformSetting` (`master_xpub_evm` / `master_xpub_btc`).
3. The three default `PlatformFeeConfig` rows (`trade_buy_fee_percent`,
   `trade_sell_fee_percent`, `trade_sponsored_fee_percent`) at `0.5`.

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
