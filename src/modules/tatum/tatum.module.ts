import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TatumWalletService } from './tatum-wallet.service';
import { TatumDepositService } from './tatum-deposit.service';
import { TatumWithdrawalService } from './tatum-withdrawal.service';
import { TatumRiskService } from './tatum-risk.service';
import { TatumWebhookService } from './tatum-webhook.service';
import { TatumWebhookController } from './tatum-webhook.controller';
import { WalletModule } from '../wallet/wallet.module';

@Global()
@Module({
  imports: [HttpModule, WalletModule],
  controllers: [TatumWebhookController],
  providers: [
    TatumWalletService,
    TatumDepositService,
    TatumWithdrawalService,
    TatumRiskService,
    TatumWebhookService,
  ],
  exports: [
    TatumWalletService,
    TatumDepositService,
    TatumWithdrawalService,
    TatumRiskService,
    TatumWebhookService,
  ],
})
export class TatumModule { }
