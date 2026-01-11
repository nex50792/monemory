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

  it('GET applies filters from query params and includes relations', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    const getCurrentUserSpy = vi.spyOn(getCurrentUserMod, 'getCurrentUser') as ReturnType<typeof vi.spyOn>
    getCurrentUserSpy.mockResolvedValue(mockUser)

    const findManyMock = vi.fn().mockResolvedValue([{ id: 'e1', title: 'Filtered', userId: 'user1' }])
    const prismaInstance: TestPrisma = { entry: { findMany: findManyMock } }
    mockPrismaModule(prismaInstance)

    const { GET } = await import('@/app/api/entries/route')

    const req = new Request('http://localhost/?q=Lunch&startDate=2026-01-01&endDate=2026-01-02&minAmount=100&maxAmount=200')
    const res = await GET(req)
    const text = await res.text()
    const json = JSON.parse(text)

    expect(res.status).toBe(200)
    expect(json).toEqual([{ id: 'e1', title: 'Filtered', userId: 'user1' }])

    expect(findManyMock).toHaveBeenCalled()
    const calledWith = findManyMock.mock.calls[0][0]
    expect(calledWith.where.userId).toBe('user1')
    expect(calledWith.where.title).toBeDefined()
    expect(calledWith.where.title.contains).toBe('Lunch')
    expect(calledWith.where.date).toBeDefined()
    expect(new Date(calledWith.where.date.gte).toISOString()).toBe(new Date('2026-01-01').toISOString())
    const expectedEnd = new Date('2026-01-02')
    expectedEnd.setHours(23, 59, 59, 999)
    expect(new Date(calledWith.where.date.lte).toISOString()).toBe(expectedEnd.toISOString())
    expect(calledWith.where.amount).toBeDefined()
    expect(calledWith.where.amount.gte).toBe(100)
    expect(calledWith.where.amount.lte).toBe(200)
    expect(calledWith.include).toEqual({ category: true, tags: true })
  })
})
