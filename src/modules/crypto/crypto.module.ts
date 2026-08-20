import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CryptoConfigService } from './crypto-config.service';
import { HdWalletService } from './hd-wallet.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
import { ChainClientService } from './chain-client.service';
import { EvmDepositProcessorService } from './evm-deposit-processor.service';
import { BtcAlchemyWebSocketService } from './btc-websocket.service';
import { WithdrawalTrackerService } from './withdrawal-tracker.service';
import { CryptoWithdrawalService } from './crypto-withdrawal.service';
import { SweepService } from './sweep.service';
import { PlatformService } from './platform.service';
import { ExchangeRateService } from './exchange-rate.service';
import { WebhookController } from './webhook.controller';
import { WebhookProcessorService } from './webhook-processor.service';
import { AddressRegistrationService } from './address-registration.service';
import { ReconciliationService } from './reconciliation.service';
import { WalletModule } from '../wallet/wallet.module';

/**
 * Hybrid webhook-based crypto module. EVM deposits arrive via Alchemy
 * Address Activity Webhook; BTC deposits arrive via Alchemy WebSocket
 * subscribeAddresses. Both are processed by the WebhookProcessorService.
 * Automated reconciliation runs on a configurable cron schedule.
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
    BtcAlchemyWebSocketService,
    WithdrawalTrackerService,
    CryptoWithdrawalService,
    SweepService,
    PlatformService,
    ExchangeRateService,
    WebhookProcessorService,
    AddressRegistrationService,
    ReconciliationService,
  ],
  exports: [
    CryptoConfigService,
    HdWalletService,
    DepositAddressRegistry,
    ChainClientService,
    EvmDepositProcessorService,
    BtcAlchemyWebSocketService,
    WithdrawalTrackerService,
    CryptoWithdrawalService,
    SweepService,
    PlatformService,
    ExchangeRateService,
    WebhookProcessorService,
    AddressRegistrationService,
    ReconciliationService,
  ],
})
export class CryptoModule {}
