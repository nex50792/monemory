import * as getCurrentUserMod from '@/lib/getCurrentUser';
import type { User } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchHandler } from '../utils/fetchHandler';

type TestTagDelegate = Partial<{
  findMany: ReturnType<typeof vi.fn>
  findUnique: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
}>;

type TestPrisma = Partial<{
  tag: TestTagDelegate
}>;

function mockPrismaModule(prismaInstance: TestPrisma) {
  vi.doMock('@/lib/prisma', () => ({ prisma: prismaInstance }))
}

vi.mock('@/lib/getCurrentUser')

describe('api/tags', () => {
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

  it('GET returns tags for current user', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)
    const findManyMock = vi.fn().mockResolvedValue([{ id: 't1', name: 'tagtag', userId: 'user1' }])
    const prismaInstance: TestPrisma = { tag: { findMany: findManyMock } }
    mockPrismaModule(prismaInstance)
    const { GET } = await import('@/app/api/tags/route')

    const { res, json } = await fetchHandler(GET)
    expect(res.status).toBe(200)
    expect(json).toEqual([{ id: 't1', name: 'tagtag', userId: 'user1' }])
  })

  it('POST creates tag', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const findUniqueMock = vi.fn().mockResolvedValue(null)
    const createMock = vi.fn().mockResolvedValue({ id: 't2', name: 'Sweet', userId: 'user1' })
    const prismaInstance: TestPrisma = { tag: { findUnique: findUniqueMock, create: createMock } }
    mockPrismaModule(prismaInstance)
    const { POST } = await import('@/app/api/tags/route')

    const { res, json } = await fetchHandler((req) => POST(req), 'POST', { name: 'Sweet' })
    expect(res.status).toBe(200)
    expect(json).toEqual({ id: 't2', name: 'Sweet', userId: 'user1' })
  })

  it('POST returns 400 for empty name', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)
    const { POST } = await import('@/app/api/tags/route')

    const { res } = await fetchHandler((req) => POST(req), 'POST', { name: '' })
    expect(res.status).toBe(400)
  })

  it('POST returns 409 for duplicate name', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const findUniqueMock = vi.fn().mockResolvedValue({ id: 'existing' })
    const prismaInstance: TestPrisma = { tag: { findUnique: findUniqueMock } }
    mockPrismaModule(prismaInstance)
    const { POST } = await import('@/app/api/tags/route')

    const { res, json } = await fetchHandler((req) => POST(req), 'POST', { name: 'tagtag' })
    expect(res.status).toBe(409)
    expect(json).toHaveProperty('error')
  })
})
