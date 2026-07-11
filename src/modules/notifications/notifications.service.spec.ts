import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../core/database/prisma.service';
import { EmailService } from './email.service';
import { FcmService } from './fcm.service';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: PrismaService;

  const mockUser = {
    id: 'user-uuid',
    email: 'test@example.com',
    preferences: {
      emailNotify: true,
      pushNotify: true,
    },
    devices: [
      { fcmToken: 'token1-fcm-test' },
      { fcmToken: 'token2-fcm-test' },
    ],
  };

  const mockTemplate = {
    id: 'template-uuid',
    type: 'AUTH_LOGIN',
    name: 'Login Alert',
    inAppTitle: 'New login detected',
    inAppBody: 'Hello {{username}}, a new login was detected on your account.',
    emailSubject: 'Secure login alert',
    emailBody: 'Dear {{username}}, login detected at {{time}}.',
    pushTitle: 'New login',
    pushBody: 'Login detected from {{username}}.',
  };

  const mockPrismaService = {
    device: {
      upsert: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    notificationTemplate: {
      findUnique: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    notificationLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockEmailService = {
    renderTemplate: jest.fn().mockImplementation((tpl, data) => {
      if (!tpl) return '';
      return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => data[key] || match);
    }),
  };

  const mockFcmService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: FcmService, useValue: mockFcmService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('registerFcmToken', () => {
    it('should upsert FCM token for user device', async () => {
      mockPrismaService.device.upsert.mockResolvedValue({ id: 'device-uuid' });

      await service.registerFcmToken('user-uuid', 'dev-123', 'fcm-token-val');

      expect(mockPrismaService.device.upsert).toHaveBeenCalledWith({
        where: {
          userId_deviceId: { userId: 'user-uuid', deviceId: 'dev-123' },
        },
        update: {
          fcmToken: 'fcm-token-val',
          lastLogin: expect.any(Date),
        },
        create: {
          userId: 'user-uuid',
          deviceId: 'dev-123',
          fcmToken: 'fcm-token-val',
          fingerprint: 'mobile-fcm-reg',
        },
      });
    });
  });

  describe('notifyUser', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.notifyUser({ userId: 'invalid-id', type: 'AUTH_LOGIN' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully compile templates and create notification logs', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrismaService.notification.create.mockResolvedValue({ id: 'notif-123' });

      await service.notifyUser({
        userId: 'user-uuid',
        type: 'AUTH_LOGIN',
        data: { username: 'john_doe', time: '12:00 PM' },
      });

      // Assert In-app notification creation
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-uuid',
          title: 'New login detected',
          body: 'Hello john_doe, a new login was detected on your account.',
          data: { username: 'john_doe', time: '12:00 PM' },
        },
      });

      // Assert database logs: IN_APP (instantly sent), EMAIL, and PUSH (2 devices)
      expect(mockPrismaService.notificationLog.create).toHaveBeenCalledTimes(4);

      // IN_APP log checking
      expect(mockPrismaService.notificationLog.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            channel: NotificationChannel.IN_APP,
            status: NotificationStatus.SENT,
          }),
        }),
      );

      // EMAIL log checking
      expect(mockPrismaService.notificationLog.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({
            channel: NotificationChannel.EMAIL,
            recipient: 'test@example.com',
            title: 'Secure login alert',
            body: 'Dear john_doe, login detected at 12:00 PM.',
            status: NotificationStatus.PENDING,
          }),
        }),
      );
    });

    it('should respect user notification preferences', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        preferences: {
          emailNotify: false,
          pushNotify: false,
        },
      });
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrismaService.notification.create.mockResolvedValue({ id: 'notif-123' });

      await service.notifyUser({
        userId: 'user-uuid',
        type: 'AUTH_LOGIN',
        data: { username: 'john_doe' },
      });

      // Should only create 1 log for IN_APP, skipping disabled EMAIL and PUSH
      expect(mockPrismaService.notificationLog.create).toHaveBeenCalledTimes(1);
    });
  });
});
