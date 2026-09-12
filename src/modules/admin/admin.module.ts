import { Module, forwardRef } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PaystackModule } from '../paystack/paystack.module';
import { WalletModule } from '../wallet/wallet.module';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [forwardRef(() => PaystackModule), forwardRef(() => WalletModule), SecurityModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
