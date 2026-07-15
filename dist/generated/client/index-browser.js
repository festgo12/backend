
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  phone: 'phone',
  passwordHash: 'passwordHash',
  role: 'role',
  status: 'status',
  twoFactorEnabled: 'twoFactorEnabled',
  twoFactorSecret: 'twoFactorSecret',
  resetToken: 'resetToken',
  resetTokenExpires: 'resetTokenExpires',
  failedLoginAttempts: 'failedLoginAttempts',
  lockedUntil: 'lockedUntil',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProfileScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  firstName: 'firstName',
  lastName: 'lastName',
  kycStatus: 'kycStatus',
  avatarUrl: 'avatarUrl',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserPreferenceScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  baseCurrency: 'baseCurrency',
  emailNotify: 'emailNotify',
  pushNotify: 'pushNotify',
  theme: 'theme',
  updatedAt: 'updatedAt'
};

exports.Prisma.WalletScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  currency: 'currency',
  balance: 'balance',
  reservedBalance: 'reservedBalance',
  address: 'address',
  updatedAt: 'updatedAt',
  version: 'version'
};

exports.Prisma.LedgerEntryScalarFieldEnum = {
  id: 'id',
  walletId: 'walletId',
  transactionId: 'transactionId',
  orderId: 'orderId',
  amount: 'amount',
  type: 'type',
  reference: 'reference',
  balanceAfter: 'balanceAfter',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.WalletTransactionScalarFieldEnum = {
  id: 'id',
  walletId: 'walletId',
  type: 'type',
  status: 'status',
  amount: 'amount',
  fee: 'fee',
  reference: 'reference',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BalanceSnapshotScalarFieldEnum = {
  id: 'id',
  walletId: 'walletId',
  balance: 'balance',
  ledgerId: 'ledgerId',
  createdAt: 'createdAt'
};

exports.Prisma.AdScalarFieldEnum = {
  id: 'id',
  sellerId: 'sellerId',
  asset: 'asset',
  type: 'type',
  price: 'price',
  quantity: 'quantity',
  minLimit: 'minLimit',
  maxLimit: 'maxLimit',
  isSponsored: 'isSponsored',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  version: 'version'
};

exports.Prisma.OrderScalarFieldEnum = {
  id: 'id',
  adId: 'adId',
  buyerId: 'buyerId',
  sellerId: 'sellerId',
  status: 'status',
  fiatAmount: 'fiatAmount',
  cryptoAmount: 'cryptoAmount',
  feeAmount: 'feeAmount',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  version: 'version',
  fraudFlagged: 'fraudFlagged'
};

exports.Prisma.DisputeScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  initiatorId: 'initiatorId',
  reason: 'reason',
  description: 'description',
  status: 'status',
  assigneeId: 'assigneeId',
  resolution: 'resolution',
  deadline: 'deadline',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EvidenceScalarFieldEnum = {
  id: 'id',
  disputeId: 'disputeId',
  url: 'url',
  fileName: 'fileName',
  fileType: 'fileType',
  fileSize: 'fileSize',
  uploadedById: 'uploadedById',
  createdAt: 'createdAt'
};

exports.Prisma.AuthTokenScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  token: 'token',
  expiresAt: 'expiresAt',
  userAgent: 'userAgent',
  ipAddress: 'ipAddress',
  lastActivity: 'lastActivity',
  createdAt: 'createdAt'
};

exports.Prisma.DeviceScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  deviceId: 'deviceId',
  fingerprint: 'fingerprint',
  deviceName: 'deviceName',
  browser: 'browser',
  osVersion: 'osVersion',
  location: 'location',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  fcmToken: 'fcmToken',
  lastLogin: 'lastLogin',
  lastActivity: 'lastActivity',
  createdAt: 'createdAt'
};

exports.Prisma.SecurityLogScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  actorId: 'actorId',
  action: 'action',
  resource: 'resource',
  resourceId: 'resourceId',
  oldValue: 'oldValue',
  newValue: 'newValue',
  metadata: 'metadata',
  ipAddress: 'ipAddress',
  device: 'device',
  success: 'success',
  errorMessage: 'errorMessage',
  createdAt: 'createdAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  body: 'body',
  data: 'data',
  isRead: 'isRead',
  createdAt: 'createdAt'
};

exports.Prisma.NotificationTemplateScalarFieldEnum = {
  id: 'id',
  type: 'type',
  name: 'name',
  emailSubject: 'emailSubject',
  emailBody: 'emailBody',
  pushTitle: 'pushTitle',
  pushBody: 'pushBody',
  inAppTitle: 'inAppTitle',
  inAppBody: 'inAppBody',
  smsBody: 'smsBody',
  systemBody: 'systemBody',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationLogScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  channel: 'channel',
  recipient: 'recipient',
  title: 'title',
  body: 'body',
  status: 'status',
  retryCount: 'retryCount',
  maxRetries: 'maxRetries',
  nextTryAt: 'nextTryAt',
  errorDetails: 'errorDetails',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SecurityAlertScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  severity: 'severity',
  title: 'title',
  message: 'message',
  metadata: 'metadata',
  isRead: 'isRead',
  createdAt: 'createdAt'
};

exports.Prisma.FraudRuleScalarFieldEnum = {
  id: 'id',
  name: 'name',
  code: 'code',
  description: 'description',
  enabled: 'enabled',
  threshold: 'threshold',
  severity: 'severity',
  action: 'action',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.Role = exports.$Enums.Role = {
  USER: 'USER',
  MODERATOR: 'MODERATOR',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN'
};

exports.UserStatus = exports.$Enums.UserStatus = {
  ACTIVE: 'ACTIVE',
  FROZEN: 'FROZEN',
  SUSPENDED: 'SUSPENDED'
};

exports.Currency = exports.$Enums.Currency = {
  NGN: 'NGN',
  USDT: 'USDT',
  BTC: 'BTC',
  ETH: 'ETH',
  USDC: 'USDC'
};

exports.LedgerType = exports.$Enums.LedgerType = {
  DEPOSIT: 'DEPOSIT',
  WITHDRAWAL: 'WITHDRAWAL',
  TRADE_RESERVE: 'TRADE_RESERVE',
  TRADE_SETTLEMENT: 'TRADE_SETTLEMENT',
  TRADE_REFUND: 'TRADE_REFUND',
  FEE: 'FEE',
  GIFT_CARD_PURCHASE: 'GIFT_CARD_PURCHASE',
  GIFT_CARD_SALE: 'GIFT_CARD_SALE'
};

exports.AdType = exports.$Enums.AdType = {
  BUY: 'BUY',
  SELL: 'SELL'
};

exports.OrderStatus = exports.$Enums.OrderStatus = {
  CREATED: 'CREATED',
  PENDING_SELLER: 'PENDING_SELLER',
  APPROVED: 'APPROVED',
  COMPLETED: 'COMPLETED',
  DECLINED: 'DECLINED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  DISPUTED: 'DISPUTED'
};

exports.DisputeStatus = exports.$Enums.DisputeStatus = {
  OPEN: 'OPEN',
  UNDER_REVIEW: 'UNDER_REVIEW',
  WAITING_FOR_USER: 'WAITING_FOR_USER',
  WAITING_FOR_ADMIN: 'WAITING_FOR_ADMIN',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
  ESCALATED: 'ESCALATED'
};

exports.NotificationChannel = exports.$Enums.NotificationChannel = {
  IN_APP: 'IN_APP',
  PUSH: 'PUSH',
  EMAIL: 'EMAIL',
  SYSTEM: 'SYSTEM'
};

exports.NotificationStatus = exports.$Enums.NotificationStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
  RETRYING: 'RETRYING'
};

exports.Prisma.ModelName = {
  User: 'User',
  Profile: 'Profile',
  UserPreference: 'UserPreference',
  Wallet: 'Wallet',
  LedgerEntry: 'LedgerEntry',
  WalletTransaction: 'WalletTransaction',
  BalanceSnapshot: 'BalanceSnapshot',
  Ad: 'Ad',
  Order: 'Order',
  Dispute: 'Dispute',
  Evidence: 'Evidence',
  AuthToken: 'AuthToken',
  Device: 'Device',
  SecurityLog: 'SecurityLog',
  Notification: 'Notification',
  NotificationTemplate: 'NotificationTemplate',
  NotificationLog: 'NotificationLog',
  SecurityAlert: 'SecurityAlert',
  FraudRule: 'FraudRule'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
