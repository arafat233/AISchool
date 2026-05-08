import { ModuleMetadata } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

/**
 * Generic mock Prisma client factory.
 * Returns a Proxy where every model property exposes jest.fn() methods.
 * Special top-level methods ($connect, $disconnect, $transaction, etc.) are also mocked.
 */
export function createMockPrismaService() {
  const modelHandler = {
    get(_target: unknown, method: string) {
      if (method === 'then') return undefined;
      return jest.fn().mockResolvedValue(null);
    },
  };

  const topLevel = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn((fn: (p: unknown) => unknown) =>
      fn(new Proxy({}, modelHandler)),
    ),
    $queryRaw: jest.fn().mockResolvedValue([]),
    $executeRaw: jest.fn().mockResolvedValue(0),
  };

  const outerHandler = {
    get(target: typeof topLevel, prop: string) {
      if (prop in target) return (target as Record<string, unknown>)[prop];
      return new Proxy({}, modelHandler);
    },
  };

  return new Proxy(topLevel, outerHandler);
}

/**
 * Helper to create a NestJS testing module and compile it.
 */
export async function createTestingModule(
  metadata: ModuleMetadata,
): Promise<TestingModule> {
  return Test.createTestingModule(metadata).compile();
}
