import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PaystackService } from './paystack.service';
import { PaystackController } from './paystack.controller';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => WalletModule),
  ],
  controllers: [PaystackController],
  providers: [PaystackService],
  exports: [PaystackService],
})
export class PaystackModule {}
