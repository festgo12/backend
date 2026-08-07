import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CryptoConfigService } from './crypto-config.service';
import { HdWalletService } from './hd-wallet.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
import { ChainClientService } from './chain-client.service';
import { EvmDepositListenerService } from './evm-deposit-listener.service';
import { BtcDepositPollerService } from './btc-deposit-poller.service';
import { WithdrawalTrackerService } from './withdrawal-tracker.service';
import { CryptoWithdrawalService } from './crypto-withdrawal.service';
import { SweepService } from './sweep.service';
import { PlatformService } from './platform.service';
import { ExchangeRateService } from './exchange-rate.service';
import { WalletModule } from '../wallet/wallet.module';

/**
 * Local-first crypto module (Alchemy). Provides HD wallet derivation, the
 * deposit address registry, chain access, WebSocket EVM deposit listening,
 * BTC deposit polling, withdrawal tracking, sweeping, platform fee wallets,
 * exchange rates and balance reconciliation.
 */
@Global()
@Module({
  imports: [HttpModule, WalletModule],
  providers: [
    CryptoConfigService,
    HdWalletService,
    DepositAddressRegistry,
    ChainClientService,
    EvmDepositListenerService,
    BtcDepositPollerService,
    WithdrawalTrackerService,
    CryptoWithdrawalService,
    SweepService,
    PlatformService,
    ExchangeRateService,
  ],
  exports: [
    CryptoConfigService,
    HdWalletService,
    DepositAddressRegistry,
    ChainClientService,
    EvmDepositListenerService,
    BtcDepositPollerService,
    WithdrawalTrackerService,
    CryptoWithdrawalService,
    SweepService,
    PlatformService,
    ExchangeRateService,
  ],
})
export class CryptoModule {}
