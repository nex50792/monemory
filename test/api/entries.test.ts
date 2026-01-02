import * as getCurrentUserMod from '@/lib/getCurrentUser';
import type { User } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchHandler } from '../utils/fetchHandler';

type TestEntryDelegate = Partial<{
  findMany: ReturnType<typeof vi.fn>
}>;

type TestPrisma = Partial<{
  entry: TestEntryDelegate
}>;

function mockPrismaModule(prismaInstance: TestPrisma) {
  vi.doMock('@/lib/prisma', () => ({ prisma: prismaInstance }))
}

vi.mock('@/lib/getCurrentUser')

describe('api/entries', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
  })

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

  it('GET returns entries for current user', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    const getCurrentUserSpy = vi.spyOn(getCurrentUserMod, 'getCurrentUser') as ReturnType<typeof vi.spyOn>
    getCurrentUserSpy.mockResolvedValue(mockUser)
    const findManyMock = vi.fn().mockResolvedValue([{ id: 'e1', title: 'Lunch', userId: 'user1' }])
    const prismaInstance: TestPrisma = { entry: { findMany: findManyMock } }
    mockPrismaModule(prismaInstance)
    const { GET } = await import('@/app/api/entries/route')

    const { res, json } = await fetchHandler(GET)
    expect(res.status).toBe(200)
    expect(json).toEqual([{ id: 'e1', title: 'Lunch', userId: 'user1' }])
  })

  it('returns 401 when not authenticated', async () => {
    const getCurrentUserSpy = vi.spyOn(getCurrentUserMod, 'getCurrentUser') as ReturnType<typeof vi.spyOn>
    getCurrentUserSpy.mockResolvedValue(null)
    const { GET } = await import('@/app/api/entries/route')
    const { res } = await fetchHandler(GET)
    expect(res.status).toBe(401)
  })

  it('returns empty array when no entries', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    const getCurrentUserSpy = vi.spyOn(getCurrentUserMod, 'getCurrentUser') as ReturnType<typeof vi.spyOn>
    getCurrentUserSpy.mockResolvedValue(mockUser)
    const findManyMock = vi.fn().mockResolvedValue([])
    const prismaInstance: TestPrisma = { entry: { findMany: findManyMock } }
    mockPrismaModule(prismaInstance)
    const { GET } = await import('@/app/api/entries/route')

    const { res, json } = await fetchHandler(GET)
    expect(res.status).toBe(200)
    expect(json).toEqual([])
  })
})
