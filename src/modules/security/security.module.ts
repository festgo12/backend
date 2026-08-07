import { Module } from '@nestjs/common';
import { SecurityService } from './security.service';
import { SecurityController } from './security.controller';
import { AdminSecurityController } from './admin-security.controller';
import { FraudRulesService } from './fraud-rules.service';
import { RiskEngineService } from './risk-engine.service';
import { AlertEngineService } from './alert-engine.service';
import { CryptoRiskService } from './crypto-risk.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [SecurityController, AdminSecurityController],
  providers: [
    SecurityService,
    FraudRulesService,
    RiskEngineService,
    AlertEngineService,
    CryptoRiskService,
  ],
  exports: [
    SecurityService,
    FraudRulesService,
    RiskEngineService,
    AlertEngineService,
    CryptoRiskService,
  ],
})
export class SecurityModule {}
