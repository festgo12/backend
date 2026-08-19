import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CryptoConfigService } from './crypto-config.service';
import { HdWalletService } from './hd-wallet.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
import { ChainClientService } from './chain-client.service';
import { EvmDepositProcessorService } from './evm-deposit-processor.service';
import { BtcDepositProcessorService } from './btc-deposit-processor.service';
import { WithdrawalTrackerService } from './withdrawal-tracker.service';
import { CryptoWithdrawalService } from './crypto-withdrawal.service';
import { SweepService } from './sweep.service';
import { PlatformService } from './platform.service';
import { ExchangeRateService } from './exchange-rate.service';
import { WebhookController } from './webhook.controller';
import { WebhookProcessorService } from './webhook-processor.service';
import { AddressRegistrationService } from './address-registration.service';
import { WalletModule } from '../wallet/wallet.module';

/**
 * Hybrid webhook-based crypto module. EVM deposits arrive via Alchemy
 * Address Activity Webhook; BTC deposits via QuickNode Streams. Both are
 * received by a unified webhook controller and processed by the
 * WebhookProcessorService.
 */
@Global()
@Module({
  imports: [HttpModule, WalletModule],
  controllers: [WebhookController],
  providers: [
    CryptoConfigService,
    HdWalletService,
    DepositAddressRegistry,
    ChainClientService,
    EvmDepositProcessorService,
    BtcDepositProcessorService,
    WithdrawalTrackerService,
    CryptoWithdrawalService,
    SweepService,
    PlatformService,
    ExchangeRateService,
    WebhookProcessorService,
    AddressRegistrationService,
  ],
  exports: [
    CryptoConfigService,
    HdWalletService,
    DepositAddressRegistry,
    ChainClientService,
    EvmDepositProcessorService,
    BtcDepositProcessorService,
    WithdrawalTrackerService,
    CryptoWithdrawalService,
    SweepService,
    PlatformService,
    ExchangeRateService,
    WebhookProcessorService,
    AddressRegistrationService,
  ],
})
export class CryptoModule {}
