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

type TemplateInput = {
  type: string;
  name: string;
  emailSubject?: string;
  emailBody?: string;
  pushTitle?: string;
  pushBody?: string;
  inAppTitle: string;
  inAppBody: string;
};

const NOTIFICATION_TEMPLATES: TemplateInput[] = [
  {
    type: 'OTP_LOGIN',
    name: 'Login Verification Code',
    emailSubject: 'Your P2N Login Code',
    emailBody: '<p>Your 6-digit verification code is:</p><div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#f5f5f5;border-radius:8px;margin:20px 0;color:#E89E2D;">{{code}}</div><p style="color:#666;">This code expires in 10 minutes. If you didn\'t request this, please ignore this email.</p>',
    pushTitle: 'P2N Login Code',
    pushBody: 'Your verification code is {{code}}',
    inAppTitle: 'Login Verification',
    inAppBody: 'Your verification code is {{code}}. It expires in 10 minutes.',
  },
  {
    type: 'PASSWORD_RESET',
    name: 'Password Reset Link',
    emailSubject: 'P2N Password Reset',
    emailBody: '<p>You requested a password reset for your P2N account.</p><p style="text-align:center;margin:24px 0;"><a href="{{resetUrl}}" style="display:inline-block;padding:12px 32px;background:#E89E2D;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">Reset Password</a></p><p style="color:#666;">This link expires in 1 hour. If you did not request this, please ignore this email.</p>',
    pushTitle: 'Password Reset Requested',
    pushBody: 'A password reset was requested for your account.',
    inAppTitle: 'Password Reset',
    inAppBody: 'A password reset link has been sent to your email address.',
  },
  {
    type: 'EMAIL_VERIFICATION',
    name: 'Email Verification Code',
    emailSubject: 'Your P2N Email Verification Code',
    emailBody: '<p>Your 6-digit email verification code is:</p><div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#f5f5f5;border-radius:8px;margin:20px 0;color:#E89E2D;">{{code}}</div><p style="color:#666;">This code expires in 15 minutes. If you didn\'t request this, please ignore this email.</p>',
    pushTitle: 'Email Verification',
    pushBody: 'Your email verification code is {{code}}',
    inAppTitle: 'Email Verification',
    inAppBody: 'A verification code has been sent to your email address.',
  },
  {
    type: 'ORDER_CREATED',
    name: 'New Buy Order',
    emailSubject: 'New Buy Order on P2N',
    emailBody: '<p>You have a new buy order.</p><p><strong>Order ID:</strong> {{orderId}}</p><p><strong>Amount:</strong> {{cryptoAmount}} NGN</p><p style="color:#666;">Please approve within 15 minutes or the order will expire.</p>',
    pushTitle: 'New Buy Order',
    pushBody: 'You have a new buy order for {{cryptoAmount}} NGN.',
    inAppTitle: 'New Buy Order',
    inAppBody: 'You have a new buy order for {{cryptoAmount}} NGN. Please approve within 15 minutes.',
  },
  {
    type: 'ORDER_COMPLETED',
    name: 'Order Completed',
    emailSubject: 'P2N Order Completed',
    emailBody: '<p>Your order has been successfully completed.</p><p><strong>Order ID:</strong> {{orderId}}</p><p><strong>Amount:</strong> {{fiatAmount}} NGN</p><p>Thank you for using P2N Marketplace.</p>',
    pushTitle: 'Order Completed',
    pushBody: 'Your order {{orderId}} has been completed.',
    inAppTitle: 'Order Completed',
    inAppBody: 'Your order for {{fiatAmount}} NGN has been completed successfully.',
  },
  {
    type: 'ORDER_DECLINED',
    name: 'Order Cancelled / Declined',
    emailSubject: 'P2N Order Cancelled',
    emailBody: '<p>An order has been cancelled or declined.</p><p><strong>Order ID:</strong> {{orderId}}</p><p style="color:#666;">If you believe this was an error, please contact support.</p>',
    pushTitle: 'Order Cancelled',
    pushBody: 'Order {{orderId}} has been cancelled or declined.',
    inAppTitle: 'Order Cancelled',
    inAppBody: 'The order {{orderId}} has been cancelled or declined.',
  },
  {
    type: 'ORDER_EXPIRED',
    name: 'Order Expired',
    emailSubject: 'P2N Order Expired',
    emailBody: '<p>An order has expired without being completed.</p><p><strong>Order ID:</strong> {{orderId}}</p><p><strong>Amount:</strong> {{fiatAmount}} NGN</p><p style="color:#666;">No funds were moved. You may create a new order at any time.</p>',
    pushTitle: 'Order Expired',
    pushBody: 'Order {{orderId}} has expired.',
    inAppTitle: 'Order Expired',
    inAppBody: 'Your order for {{fiatAmount}} NGN has expired.',
  },
  {
    type: 'ORDER_FRAUD_FLAGGED',
    name: 'Order Flagged for Fraud',
    emailSubject: 'P2N Security: Order Flagged',
    emailBody: '<p>An order has been flagged for suspicious activity and cancelled.</p><p><strong>Order ID:</strong> {{orderId}}</p><p style="color:#666;">If you believe this was a mistake, please contact our support team immediately.</p>',
    pushTitle: 'Order Flagged for Fraud',
    pushBody: 'Order {{orderId}} has been flagged for fraud and cancelled.',
    inAppTitle: 'Order Flagged',
    inAppBody: 'Order {{orderId}} has been flagged for suspicious activity and cancelled.',
  },
  {
    type: 'ORDER_FROZEN',
    name: 'Order Frozen',
    emailSubject: 'P2N Order Frozen',
    emailBody: '<p>An order has been frozen due to an active dispute.</p><p><strong>Order ID:</strong> {{orderId}}</p><p style="color:#666;">No actions can be taken on this order until the dispute is resolved. You will be notified when the status changes.</p>',
    pushTitle: 'Order Frozen',
    pushBody: 'Order {{orderId}} has been frozen due to an active dispute.',
    inAppTitle: 'Order Frozen',
    inAppBody: 'Order {{orderId}} has been frozen due to an active dispute.',
  },
  {
    type: 'DISPUTE_OPENED',
    name: 'Dispute Opened',
    emailSubject: 'P2N Dispute Opened',
    emailBody: '<p>A dispute has been opened.</p><p><strong>Dispute ID:</strong> {{disputeId}}</p><p><strong>Order ID:</strong> {{orderId}}</p><p style="color:#666;">Our support team will review the case shortly. Please ensure all relevant evidence is available.</p>',
    pushTitle: 'Dispute Opened',
    pushBody: 'A dispute has been opened for order {{orderId}}.',
    inAppTitle: 'Dispute Opened',
    inAppBody: 'A dispute has been opened for order {{orderId}}. Our team will review it shortly.',
  },
  {
    type: 'DISPUTE_STATUS_CHANGED',
    name: 'Dispute Status Updated',
    emailSubject: 'P2N Dispute Status Update',
    emailBody: '<p>The status of your dispute has been updated.</p><p><strong>Dispute ID:</strong> {{disputeId}}</p><p><strong>New Status:</strong> {{status}}</p>',
    pushTitle: 'Dispute Status Updated',
    pushBody: 'Your dispute status has changed to {{status}}.',
    inAppTitle: 'Dispute Status Updated',
    inAppBody: 'Your dispute status has changed from {{previousStatus}} to {{status}}.',
  },
  {
    type: 'DISPUTE_RESOLVED',
    name: 'Dispute Resolved',
    emailSubject: 'P2N Dispute Resolved',
    emailBody: '<p>Your dispute has been resolved.</p><p><strong>Dispute ID:</strong> {{disputeId}}</p><p><strong>Outcome:</strong> {{outcome}}</p><p><strong>Resolution:</strong> {{resolution}}</p>',
    pushTitle: 'Dispute Resolved',
    pushBody: 'Your dispute has been resolved with outcome: {{outcome}}.',
    inAppTitle: 'Dispute Resolved',
    inAppBody: 'Your dispute has been {{outcome}}. Resolution: {{resolution}}',
  },
  {
    type: 'EVIDENCE_UPLOADED',
    name: 'Evidence Submitted',
    emailSubject: 'P2N: New Evidence Submitted',
    emailBody: '<p>New evidence has been submitted in a dispute.</p><p><strong>Dispute ID:</strong> {{disputeId}}</p><p style="color:#666;">You may review the evidence in the dispute details page.</p>',
    pushTitle: 'New Evidence',
    pushBody: 'New evidence has been submitted for dispute {{disputeId}}.',
    inAppTitle: 'New Evidence Submitted',
    inAppBody: 'New evidence has been submitted for dispute {{disputeId}}.',
  },
  {
    type: 'DISPUTE_ASSIGNED',
    name: 'Dispute Under Review',
    emailSubject: 'P2N: Your Dispute Is Under Review',
    emailBody: '<p>Your dispute has been assigned to a support agent and is now under review.</p><p><strong>Dispute ID:</strong> {{disputeId}}</p><p style="color:#666;">You will be notified once a decision has been made.</p>',
    pushTitle: 'Dispute Under Review',
    pushBody: 'Your dispute has been assigned to a support agent.',
    inAppTitle: 'Dispute Under Review',
    inAppBody: 'Your dispute has been assigned to a support agent and is now under review.',
  },
  {
    type: 'SECURITY_ALERT',
    name: 'Security Alert',
    emailSubject: 'P2N Security Alert',
    emailBody: '<p style="color:#c0392b;font-weight:bold;">A security alert has been triggered on your account.</p><p><strong>Alert Type:</strong> {{type}}</p><p><strong>Severity:</strong> {{severity}}</p><p style="color:#666;">If you did not perform this action, please change your password immediately and contact support.</p>',
    pushTitle: 'Security Alert',
    pushBody: '{{title}} - {{severity}} severity.',
    inAppTitle: 'Security Alert',
    inAppBody: '{{title}}',
  },
  {
    type: 'GIFT_CARD_LISTING_APPROVED',
    name: 'Gift Card Listing Approved',
    emailSubject: 'P2N: Gift Card Listing Approved',
    emailBody: '<p>Your gift card listing has been approved and is now live in the marketplace.</p><p><strong>Brand:</strong> {{brand}}</p><p><strong>Listing ID:</strong> {{listingId}}</p>',
    pushTitle: 'Listing Approved',
    pushBody: 'Your {{brand}} gift card listing is now live.',
    inAppTitle: 'Gift Card Listing Approved',
    inAppBody: 'Your {{brand}} gift card listing has been approved and is now live in the marketplace.',
  },
  {
    type: 'GIFT_CARD_LISTING_REJECTED',
    name: 'Gift Card Listing Rejected',
    emailSubject: 'P2N: Gift Card Listing Rejected',
    emailBody: '<p>Your gift card listing has been rejected.</p><p><strong>Brand:</strong> {{brand}}</p><p><strong>Listing ID:</strong> {{listingId}}</p>{{#if reason}}<p><strong>Reason:</strong> {{reason}}</p>{{/if}}<p style="color:#666;">You may update your listing and resubmit it for review.</p>',
    pushTitle: 'Listing Rejected',
    pushBody: 'Your {{brand}} gift card listing was rejected.',
    inAppTitle: 'Gift Card Listing Rejected',
    inAppBody: 'Your {{brand}} gift card listing was rejected.',
  },
  {
    type: 'GIFT_CARD_PURCHASE',
    name: 'Gift Card Purchase Confirmed',
    emailSubject: 'P2N: Gift Card Purchase Confirmed',
    emailBody: '<p>Your gift card purchase has been confirmed.</p><p><strong>Order ID:</strong> {{orderId}}</p><p style="color:#666;">Please confirm receipt once you\'ve received the card.</p>',
    pushTitle: 'Gift Card Purchased',
    pushBody: 'Your gift card purchase has been confirmed.',
    inAppTitle: 'Gift Card Purchase Confirmed',
    inAppBody: 'Your gift card purchase has been confirmed. Please confirm receipt once you\'ve received the card.',
  },
  {
    type: 'GIFT_CARD_SOLD',
    name: 'Gift Card Sold',
    emailSubject: 'P2N: Your Gift Card Was Sold',
    emailBody: '<p>Your gift card has been purchased!</p><p><strong>Order ID:</strong> {{orderId}}</p><p style="color:#666;">Funds will be released upon buyer confirmation of receipt.</p>',
    pushTitle: 'Gift Card Sold',
    pushBody: 'Your gift card has been purchased!',
    inAppTitle: 'Gift Card Sold',
    inAppBody: 'Your gift card has been purchased! Funds will be released upon buyer confirmation.',
  },
  {
    type: 'GIFT_CARD_COMPLETED',
    name: 'Gift Card Received',
    emailSubject: 'P2N: Gift Card Code Available',
    emailBody: '<p>Your gift card code is now available.</p><p><strong>Order ID:</strong> {{orderId}}</p><p>Thank you for your purchase!</p>',
    pushTitle: 'Gift Card Received',
    pushBody: 'Your gift card code is now available.',
    inAppTitle: 'Gift Card Received',
    inAppBody: 'Your gift card code is now available. Thank you for your purchase!',
  },
  {
    type: 'GIFT_CARD_SALE_COMPLETED',
    name: 'Gift Card Sale Completed',
    emailSubject: 'P2N: Gift Card Sale Completed',
    emailBody: '<p>The buyer has confirmed receipt. Your funds have been released.</p><p><strong>Order ID:</strong> {{orderId}}</p>',
    pushTitle: 'Sale Completed',
    pushBody: 'Your gift card sale has been completed. Funds released.',
    inAppTitle: 'Gift Card Sale Completed',
    inAppBody: 'The buyer has confirmed receipt. Your funds have been released.',
  },
  {
    type: 'GIFT_CARD_ORDER_CANCELLED',
    name: 'Gift Card Order Cancelled',
    emailSubject: 'P2N: Gift Card Order Cancelled',
    emailBody: '<p>A gift card order has been cancelled.</p><p><strong>Order ID:</strong> {{orderId}}</p><p style="color:#666;">Any held funds have been refunded.</p>',
    pushTitle: 'Gift Card Order Cancelled',
    pushBody: 'Gift card order {{orderId}} has been cancelled.',
    inAppTitle: 'Gift Card Order Cancelled',
    inAppBody: 'A gift card order has been cancelled. Any held funds have been refunded.',
  },
];

async function seedNotificationTemplates(prisma: PrismaService): Promise<void> {
  let created = 0;
  let updated = 0;

  for (const tpl of NOTIFICATION_TEMPLATES) {
    const existing = await prisma.notificationTemplate.findUnique({
      where: { type: tpl.type },
    });

    if (existing) {
      await prisma.notificationTemplate.update({
        where: { type: tpl.type },
        data: tpl,
      });
      updated++;
    } else {
      await prisma.notificationTemplate.create({ data: tpl });
      created++;
    }
  }

  logger.log(`Notification templates: ${created} created, ${updated} updated (${NOTIFICATION_TEMPLATES.length} total)`);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const prisma = app.get(PrismaService);
    const platformService = app.get(PlatformService);

    await seedSuperAdmin(prisma);
    await seedFeeConfigs(prisma);
    await seedNotificationTemplates(prisma);

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
