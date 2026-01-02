import { GET } from '@/app/api/entries/route'
import * as getCurrentUserMod from '@/lib/getCurrentUser'
import * as prismaMod from '@/lib/prisma'
import type { User } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchHandler } from '../utils/fetchHandler'

vi.mock('@/lib/getCurrentUser')
vi.mock('@/lib/prisma')

describe('api/entries', () => {
  beforeEach(() => {
    vi.resetAllMocks()
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
    const prismaInstance = { entry: { findMany: vi.fn() } } as any
    ;(prismaInstance.entry.findMany as any).mockResolvedValue([{ id: 'e1', title: 'Lunch', userId: 'user1' }])
    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance)

    const { res, json } = await fetchHandler(GET)
    expect(res.status).toBe(200)
    expect(json).toEqual([{ id: 'e1', title: 'Lunch', userId: 'user1' }])
  })

  it('returns 401 when not authenticated', async () => {
    const getCurrentUserSpy = vi.spyOn(getCurrentUserMod, 'getCurrentUser') as ReturnType<typeof vi.spyOn>
    getCurrentUserSpy.mockResolvedValue(null)
    const { res } = await fetchHandler(GET)
    expect(res.status).toBe(401)
  })

  it('returns empty array when no entries', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    const getCurrentUserSpy = vi.spyOn(getCurrentUserMod, 'getCurrentUser') as ReturnType<typeof vi.spyOn>
    getCurrentUserSpy.mockResolvedValue(mockUser)
    const prismaInstance = { entry: { findMany: vi.fn() } } as any
    ;(prismaInstance.entry.findMany as any).mockResolvedValue([])
    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance)

    const { res, json } = await fetchHandler(GET)
    expect(res.status).toBe(200)
    expect(json).toEqual([])
  })
})
