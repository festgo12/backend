import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';
import { PlatformService } from '../src/modules/crypto/platform.service';
import { Role, UserStatus } from '../src/generated/client';

const logger = new Logger('Seed');

/**
 * Seeds a fresh database:
 *  1. A SUPER_ADMIN login (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD, defaults
 *     admin@admin.com / Admin@12345!) with profile + preferences.
 *  2. The internal platform user and BTC/ETH/USDT/USDC fee wallets (via
 *     PlatformService.ensurePlatformWallets, which also mirrors the HD master
 *     xpubs into PlatformSetting).
 *  3. The three default PlatformFeeConfig rows (0.5%).
 * Idempotent: safe to re-run against an existing database.
 */
async function seedSuperAdmin(prisma: PrismaService): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@admin.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345!';
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerified: true,
    },
    create: {
      email,
      passwordHash,
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      profile: {
        create: {
          firstName: 'Platform',
          lastName: 'Admin',
          kycStatus: 'VERIFIED',
        },
      },
      preferences: { create: {} },
    },
  });

  logger.log(`Super admin ensured: ${email}`);
}

async function seedFeeConfigs(prisma: PrismaService): Promise<void> {
  const defaults = [
    {
      key: 'trade_buy_fee_percent',
      value: 0.5,
      label: 'Trade Fee (Buy Side) %',
    },
    {
      key: 'trade_sell_fee_percent',
      value: 0.5,
      label: 'Trade Fee (Sell Side) %',
    },
    {
      key: 'trade_sponsored_fee_percent',
      value: 0.5,
      label: 'Sponsored Ad Fee %',
    },
  ];

  for (const d of defaults) {
    await prisma.platformFeeConfig.upsert({
      where: { key: d.key },
      update: { value: d.value, label: d.label },
      create: { key: d.key, value: d.value, label: d.label },
    });
  }

  logger.log(`Seeded ${defaults.length} default fee configs`);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const prisma = app.get(PrismaService);
    const platformService = app.get(PlatformService);

    await seedSuperAdmin(prisma);
    await seedFeeConfigs(prisma);

    const result = await platformService.ensurePlatformWallets();
    logger.log(
      `Platform user ${result.userId} ready with ${result.wallets.length} fee wallets`,
    );

    logger.log('Seed complete');
  } finally {
    await app.close();
  }
}

bootstrap()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
