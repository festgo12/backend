import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TatumWalletService } from './tatum-wallet.service';
import { TatumDepositService } from './tatum-deposit.service';
import { TatumWithdrawalService } from './tatum-withdrawal.service';
import { TatumRiskService } from './tatum-risk.service';
import { TatumWebhookService } from './tatum-webhook.service';
import { TatumWebhookController } from './tatum-webhook.controller';
import { TatumExchangeRateService } from './tatum-exchange-rate.service';
import { TatumTransferService } from './tatum-transfer.service';
import { TatumPlatformService } from './tatum-platform.service';
import { TatumReconciliationService } from './tatum-reconciliation.service';
import { WalletModule } from '../wallet/wallet.module';
import { SecurityModule } from '../security/security.module';

@Global()
@Module({
  imports: [HttpModule, WalletModule, SecurityModule],
  controllers: [TatumWebhookController],
  providers: [
    TatumWalletService,
    TatumDepositService,
    TatumWithdrawalService,
    TatumRiskService,
    TatumWebhookService,
    TatumExchangeRateService,
    TatumTransferService,
    TatumPlatformService,
    TatumReconciliationService,
  ],
  exports: [
    TatumWalletService,
    TatumDepositService,
    TatumWithdrawalService,
    TatumRiskService,
    TatumWebhookService,
    TatumExchangeRateService,
    TatumTransferService,
    TatumPlatformService,
    TatumReconciliationService,
  ],
})
export class TatumModule {}
