import * as getCurrentUserMod from '@/lib/getCurrentUser';
import type { User } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchHandler } from '../utils/fetchHandler';

type TestCategoryDelegate = Partial<{
  findMany: ReturnType<typeof vi.fn>
  findUnique: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
}>;

type TestPrisma = Partial<{
  category: TestCategoryDelegate
}>;

function mockPrismaModule(prismaInstance: TestPrisma) {
  vi.doMock('@/lib/prisma', () => ({ prisma: prismaInstance }))
}

vi.mock('@/lib/getCurrentUser')

const makeMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user1',
  name: null,
  clerkUserId: 'clerk_user1',
  email: null,
  isAdmin: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

describe('api/categories', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
  })

  it('GET returns categories for current user', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)
    const findManyMock = vi.fn().mockResolvedValue([{ id: 'c1', name: 'Food', userId: 'user1' }])
    const prismaInstance: TestPrisma = { category: { findMany: findManyMock } }
    mockPrismaModule(prismaInstance)
    const { GET } = await import('@/app/api/categories/route')

    const { res, json } = await fetchHandler(GET)
    expect(res.status).toBe(200)
    expect(json).toEqual([{ id: 'c1', name: 'Food', userId: 'user1' }])
  })

  it('POST creates category', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const findUniqueMock = vi.fn().mockResolvedValue(null)
    const createMock = vi.fn().mockResolvedValue({ id: 'c2', name: 'Travel', userId: 'user1' })
    const prismaInstance: TestPrisma = { category: { findUnique: findUniqueMock, create: createMock } }
    mockPrismaModule(prismaInstance)
    const { POST } = await import('@/app/api/categories/route')

    const { res, json } = await fetchHandler((req) => POST(req), 'POST', { name: 'Travel' })
    expect(res.status).toBe(200)
    expect(json).toEqual({ id: 'c2', name: 'Travel', userId: 'user1' })
  })

  it('POST returns 400 for empty name', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)
    const { POST } = await import('@/app/api/categories/route')

    const { res } = await fetchHandler((req) => POST(req), 'POST', { name: '' })
    expect(res.status).toBe(400)
  })

  it('POST returns 409 for duplicate name', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const findUniqueMock = vi.fn().mockResolvedValue({ id: 'existing' })
    const prismaInstance: TestPrisma = { category: { findUnique: findUniqueMock } }
    mockPrismaModule(prismaInstance)
    const { POST } = await import('@/app/api/categories/route')

    const { res, json } = await fetchHandler((req) => POST(req), 'POST', { name: 'Food' })
    expect(res.status).toBe(409)
    expect(json).toHaveProperty('error')
  })
})
