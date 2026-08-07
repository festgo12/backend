"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const app_module_1 = require("../src/app.module");
const prisma_service_1 = require("../src/core/database/prisma.service");
const platform_service_1 = require("../src/modules/crypto/platform.service");
const client_1 = require("../src/generated/client");
const logger = new common_1.Logger('Seed');
async function seedSuperAdmin(prisma) {
    const email = process.env.SEED_ADMIN_EMAIL || 'admin@admin.com';
    const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345!';
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.upsert({
        where: { email },
        update: {
            role: client_1.Role.SUPER_ADMIN,
            status: client_1.UserStatus.ACTIVE,
            passwordHash,
            emailVerified: true,
        },
        create: {
            email,
            passwordHash,
            role: client_1.Role.SUPER_ADMIN,
            status: client_1.UserStatus.ACTIVE,
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
async function seedFeeConfigs(prisma) {
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
async function bootstrap() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    try {
        const prisma = app.get(prisma_service_1.PrismaService);
        const platformService = app.get(platform_service_1.PlatformService);
        await seedSuperAdmin(prisma);
        await seedFeeConfigs(prisma);
        const result = await platformService.ensurePlatformWallets();
        logger.log(`Platform user ${result.userId} ready with ${result.wallets.length} fee wallets`);
        logger.log('Seed complete');
    }
    finally {
        await app.close();
    }
}
bootstrap()
    .then(() => process.exit(0))
    .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map