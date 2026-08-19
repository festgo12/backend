import { DepositAddressRegistry } from './deposit-address-registry.service';
import { PrismaService } from '../../core/database/prisma.service';
import { AddressRegistrationService } from './address-registration.service';

describe('DepositAddressRegistry', () => {
  let registry: DepositAddressRegistry;

  beforeEach(() => {
    registry = new DepositAddressRegistry(
      {} as PrismaService,
      {
        registerAddress: jest.fn().mockResolvedValue(undefined),
      } as unknown as AddressRegistrationService,
    );
  });

  describe('register / lookup / has', () => {
    it('registers an address for a chain and wallet', () => {
      registry.register(
        '0xAbCdEf1234567890abcdef1234567890AbCdEf12',
        'EVM',
        'w-1',
      );
      expect(
        registry.has('0xAbCdEf1234567890abcdef1234567890AbCdEf12', 'EVM'),
      ).toBe(true);
      expect(
        registry.lookup('0xAbCdEf1234567890abcdef1234567890AbCdEf12', 'EVM'),
      ).toEqual([{ chain: 'EVM', walletId: 'w-1' }]);
    });

    it('normalizes EVM addresses to lowercase for lookups', () => {
      registry.register(
        '0xAbCdEf1234567890abcdef1234567890AbCdEf12',
        'EVM',
        'w-1',
      );
      expect(
        registry.has('0xabcdef1234567890abcdef1234567890abcdef12', 'EVM'),
      ).toBe(true);
      expect(
        registry.lookup('0xABCDEF1234567890ABCDEF1234567890ABCDEF12', 'EVM'),
      ).toEqual([{ chain: 'EVM', walletId: 'w-1' }]);
    });

    it('returns false / empty array for unknown addresses', () => {
      expect(registry.has('0xdeadbeef', 'EVM')).toBe(false);
      expect(registry.lookup('0xdeadbeef', 'EVM')).toEqual([]);
    });
  });

  describe('unregister', () => {
    it('removes a registration', () => {
      registry.register(
        '0xAbCdEf1234567890abcdef1234567890AbCdEf12',
        'EVM',
        'w-1',
      );
      registry.unregister(
        '0xabcdef1234567890abcdef1234567890abcdef12',
        'EVM',
        'w-1',
      );
      expect(
        registry.has('0xAbCdEf1234567890abcdef1234567890AbCdEf12', 'EVM'),
      ).toBe(false);
    });
  });

  describe('addressesForChain', () => {
    it('returns all registered addresses for a chain', () => {
      registry.register(
        '0xAbCdEf1234567890abcdef1234567890AbCdEf12',
        'EVM',
        'w-1',
      );
      registry.register(
        '0x0000000000000000000000000000000000000001',
        'EVM',
        'w-2',
      );
      registry.register(
        'tb1qj0ruzthcv9s8kr55uuvcm73zj5zva3jh93swme',
        'BTC',
        'w-3',
      );

      const evm = registry.addressesForChain('EVM');
      expect(evm).toHaveLength(2);
      expect(evm).toContain('0xabcdef1234567890abcdef1234567890abcdef12');
      expect(registry.addressesForChain('BTC')).toEqual([
        'tb1qj0ruzthcv9s8kr55uuvcm73zj5zva3jh93swme',
      ]);
    });
  });
});
