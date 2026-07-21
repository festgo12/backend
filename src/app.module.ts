import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { CoreModule } from './core/core.module';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AdminModule } from './modules/admin/admin.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { OrdersModule } from './modules/orders/orders.module';
import { TatumModule } from './modules/tatum/tatum.module';
import { PaystackModule } from './modules/paystack/paystack.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { UploadModule } from './modules/upload/upload.module';
import { SecurityModule } from './modules/security/security.module';
import { GiftCardModule } from './modules/gift-card/gift-card.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    CoreModule, 
    AuthModule, 
    UsersModule, 
    AdminModule, 
    WalletModule,
    MarketplaceModule,
    OrdersModule,
    TatumModule,
    PaystackModule,
    TransactionsModule,
    NotificationsModule,
    AuditModule,
    DisputesModule,
    UploadModule,
    SecurityModule,
    GiftCardModule,
    ReportingModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
