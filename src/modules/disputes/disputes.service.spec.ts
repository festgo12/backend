import { Test, TestingModule } from '@nestjs/testing';
import { DisputesService } from './disputes.service';
import { PrismaService } from '../../core/database/prisma.service';
import { UploadService } from '../upload/upload.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { DisputeStatus, OrderStatus } from '@src/generated/client';

const mockPrismaService = {
  $transaction: jest.fn(),
  dispute: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  evidence: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
  securityLog: {
    create: jest.fn(),
  },
};

const mockUploadService = {
  getFileUrl: jest.fn().mockReturnValue('/uploads/disputes/test-file.jpg'),
};

const mockEventEmitter = {
  emit: jest.fn(),
};

describe('DisputesService', () => {
  let service: DisputesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UploadService, useValue: mockUploadService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<DisputesService>(DisputesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDispute', () => {
    const mockOrder = {
      id: 'order-1',
      buyerId: 'user-1',
      sellerId: 'user-2',
      status: OrderStatus.APPROVED,
      ad: { asset: 'BTC' },
    };

    const mockDispute = {
      id: 'dispute-1',
      orderId: 'order-1',
      initiatorId: 'user-1',
      reason: 'Payment not received',
      description: 'I sent payment but seller has not confirmed',
      status: DisputeStatus.OPEN,
    };

    it('should create a dispute successfully', async () => {
      mockPrismaService.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          order: {
            findUnique: jest.fn().mockResolvedValue(mockOrder),
            update: jest.fn().mockResolvedValue({ ...mockOrder, status: OrderStatus.DISPUTED }),
          },
          dispute: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockDispute),
          },
        };
        return cb(tx);
      });

      const result = await service.createDispute('user-1', {
        orderId: 'order-1',
        reason: 'Payment not received',
        description: 'I sent payment but seller has not confirmed',
      });

      expect(result).toEqual(mockDispute);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('dispute.created', expect.any(Object));
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrismaService.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          order: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return cb(tx);
      });

      await expect(
        service.createDispute('user-1', {
          orderId: 'non-existent',
          reason: 'Payment not received',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not a participant', async () => {
      mockPrismaService.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          order: {
            findUnique: jest.fn().mockResolvedValue(mockOrder),
          },
        };
        return cb(tx);
      });

      await expect(
        service.createDispute('user-999', {
          orderId: 'order-1',
          reason: 'Payment not received',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if order is in terminal status', async () => {
      const completedOrder = { ...mockOrder, status: OrderStatus.COMPLETED };
      mockPrismaService.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          order: {
            findUnique: jest.fn().mockResolvedValue(completedOrder),
          },
        };
        return cb(tx);
      });

      await expect(
        service.createDispute('user-1', {
          orderId: 'order-1',
          reason: 'Payment not received',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if active dispute already exists', async () => {
      mockPrismaService.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          order: {
            findUnique: jest.fn().mockResolvedValue(mockOrder),
          },
          dispute: {
            findFirst: jest.fn().mockResolvedValue({ id: 'existing-dispute' }),
          },
        };
        return cb(tx);
      });

      await expect(
        service.createDispute('user-1', {
          orderId: 'order-1',
          reason: 'Payment not received',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getDispute', () => {
    it('should return dispute for authorized user', async () => {
      const mockDispute = {
        id: 'dispute-1',
        initiatorId: 'user-1',
        order: { ad: true, buyer: true, seller: true },
        initiator: { id: 'user-1' },
        assignee: null,
        evidence: [],
      };

      mockPrismaService.dispute.findUnique.mockResolvedValue(mockDispute);

      const result = await service.getDispute('dispute-1', 'user-1');
      expect(result).toEqual(mockDispute);
    });

    it('should throw ForbiddenException for non-initiator', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue({
        id: 'dispute-1',
        initiatorId: 'user-1',
      });

      await expect(service.getDispute('dispute-1', 'user-2')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if dispute not found', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(null);

      await expect(service.getDispute('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addEvidence', () => {
    const mockFile = {
      filename: 'test-file.jpg',
      originalname: 'photo.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
    } as Express.Multer.File;

    it('should add evidence successfully', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue({
        id: 'dispute-1',
        initiatorId: 'user-1',
        status: DisputeStatus.OPEN,
      });
      mockPrismaService.evidence.create.mockResolvedValue({
        id: 'evidence-1',
        disputeId: 'dispute-1',
        url: '/uploads/disputes/test-file.jpg',
        fileName: 'photo.jpg',
        fileType: 'image/jpeg',
        fileSize: 1024,
        uploadedById: 'user-1',
        uploadedBy: { id: 'user-1' },
      });

      const result = await service.addEvidence('dispute-1', 'user-1', mockFile);

      expect(result.url).toBe('/uploads/disputes/test-file.jpg');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('evidence.uploaded', expect.any(Object));
    });

    it('should throw ForbiddenException if not dispute initiator', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue({
        id: 'dispute-1',
        initiatorId: 'user-1',
        status: DisputeStatus.OPEN,
      });

      await expect(
        service.addEvidence('dispute-1', 'user-2', mockFile),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if dispute is closed', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue({
        id: 'dispute-1',
        initiatorId: 'user-1',
        status: DisputeStatus.RESOLVED,
      });

      await expect(
        service.addEvidence('dispute-1', 'user-1', mockFile),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateDisputeStatus', () => {
    it('should update status for valid transition', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue({
        id: 'dispute-1',
        status: DisputeStatus.OPEN,
      });
      mockPrismaService.dispute.update.mockResolvedValue({
        id: 'dispute-1',
        status: DisputeStatus.UNDER_REVIEW,
        order: {},
        initiator: {},
        evidence: [],
      });

      const result = await service.updateDisputeStatus(
        'dispute-1',
        DisputeStatus.UNDER_REVIEW,
        'admin-1',
      );

      expect(result.status).toBe(DisputeStatus.UNDER_REVIEW);
    });

    it('should throw BadRequestException for invalid transition', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue({
        id: 'dispute-1',
        status: DisputeStatus.RESOLVED,
      });

      await expect(
        service.updateDisputeStatus('dispute-1', DisputeStatus.OPEN, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resolveDispute', () => {
    it('should resolve a dispute successfully', async () => {
      mockPrismaService.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          dispute: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'dispute-1',
              status: DisputeStatus.UNDER_REVIEW,
              orderId: 'order-1',
              order: { id: 'order-1' },
            }),
            update: jest.fn().mockResolvedValue({
              id: 'dispute-1',
              status: DisputeStatus.RESOLVED,
              resolution: 'Refunded to buyer',
              order: { id: 'order-1' },
              initiator: {},
              evidence: [],
            }),
          },
          order: {
            update: jest.fn().mockResolvedValue({ id: 'order-1', status: OrderStatus.COMPLETED }),
          },
        };
        return cb(tx);
      });

      const result = await service.resolveDispute(
        'dispute-1',
        'Refunded to buyer',
        DisputeStatus.RESOLVED,
        'admin-1',
      );

      expect(result.status).toBe(DisputeStatus.RESOLVED);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('dispute.resolved', expect.any(Object));
    });

    it('should throw BadRequestException if dispute is already closed', async () => {
      mockPrismaService.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          dispute: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'dispute-1',
              status: DisputeStatus.RESOLVED,
              orderId: 'order-1',
            }),
          },
        };
        return cb(tx);
      });

      await expect(
        service.resolveDispute('dispute-1', 'resolution', DisputeStatus.RESOLVED, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('freezeOrder', () => {
    it('should freeze order successfully', async () => {
      mockPrismaService.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          dispute: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'dispute-1',
              order: { status: OrderStatus.APPROVED },
            }),
          },
          order: {
            update: jest.fn().mockResolvedValue({
              id: 'order-1',
              status: OrderStatus.DISPUTED,
            }),
          },
        };
        return cb(tx);
      });

      const result = await service.freezeOrder('dispute-1', 'admin-1');
      expect(result.status).toBe(OrderStatus.DISPUTED);
    });

    it('should throw BadRequestException if order is in terminal status', async () => {
      mockPrismaService.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          dispute: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'dispute-1',
              order: { status: OrderStatus.COMPLETED },
            }),
          },
        };
        return cb(tx);
      });

      await expect(service.freezeOrder('dispute-1', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getDisputeStats', () => {
    it('should return dispute statistics', async () => {
      mockPrismaService.dispute.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(5);
      mockPrismaService.dispute.groupBy.mockResolvedValue([
        { status: DisputeStatus.OPEN, _count: { status: 30 } },
        { status: DisputeStatus.RESOLVED, _count: { status: 50 } },
      ]);
      mockPrismaService.dispute.findMany.mockResolvedValue([
        { createdAt: new Date('2026-07-14'), updatedAt: new Date('2026-07-15') },
      ]);

      const result = await service.getDisputeStats();

      expect(result.total).toBe(100);
      expect(result.last24h).toBe(5);
      expect(result.byStatus).toHaveLength(2);
      expect(result.avgResolutionHours).toBeGreaterThan(0);
    });
  });
});
