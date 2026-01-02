import { GET, POST } from '@/app/api/categories/route'
import * as getCurrentUserMod from '@/lib/getCurrentUser'
import * as prismaMod from '@/lib/prisma'
import type { User } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchHandler } from '../utils/fetchHandler'

vi.mock('@/lib/getCurrentUser')
vi.mock('@/lib/prisma')

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
  })

  it('GET returns categories for current user', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)
    const prismaInstance = { category: { findMany: vi.fn() } } as any
    ;(prismaInstance.category.findMany as any).mockResolvedValue([{ id: 'c1', name: 'Food', userId: 'user1' }])
    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance)

    const { res, json } = await fetchHandler(GET)
    expect(res.status).toBe(200)
    expect(json).toEqual([{ id: 'c1', name: 'Food', userId: 'user1' }])
  })

  it('POST creates category', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const prismaInstance = { category: { findUnique: vi.fn(), create: vi.fn() } } as any
    ;(prismaInstance.category.findUnique as any).mockResolvedValue(null)
    ;(prismaInstance.category.create as any).mockResolvedValue({ id: 'c2', name: 'Travel', userId: 'user1' })
    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance)

    const { res, json } = await fetchHandler((req) => POST(req), 'POST', { name: 'Travel' })
    expect(res.status).toBe(200)
    expect(json).toEqual({ id: 'c2', name: 'Travel', userId: 'user1' })
  })

  it('POST returns 400 for empty name', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const { res } = await fetchHandler((req) => POST(req), 'POST', { name: '' })
    expect(res.status).toBe(400)
  })

  it('POST returns 409 for duplicate name', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const prismaInstance = { category: { findUnique: vi.fn() } } as any
    ;(prismaInstance.category.findUnique as any).mockResolvedValue({ id: 'existing' })
    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance)

    const { res, json } = await fetchHandler((req) => POST(req), 'POST', { name: 'Food' })
    expect(res.status).toBe(409)
    expect(json).toHaveProperty('error')
  })
})
