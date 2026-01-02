import { GET, POST } from '@/app/api/tags/route'
import * as getCurrentUserMod from '@/lib/getCurrentUser'
import * as prismaMod from '@/lib/prisma'
import type { User } from '@prisma/client'
import { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchHandler } from '../utils/fetchHandler'

vi.mock('@/lib/getCurrentUser')
vi.mock('@/lib/prisma')

describe('api/tags', () => {
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

  it('GET returns tags for current user', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)
    const prismaInstance = new PrismaClient()
    const findManyMock = vi.fn().mockResolvedValue([{ id: 't1', name: 'tagtag', userId: 'user1' }])
    vi.spyOn(prismaInstance.tag, 'findMany').mockImplementation(findManyMock)
    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance)

    const { res, json } = await fetchHandler(GET)
    expect(res.status).toBe(200)
    expect(json).toEqual([{ id: 't1', name: 'tagtag', userId: 'user1' }])
  })

  it('POST creates tag', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const prismaInstance = new PrismaClient()
    const createMock = vi.fn().mockResolvedValue({ id: 't2', name: 'Sweet', userId: 'user1' })
    const findUniqueMock = vi.fn().mockResolvedValue(null)
    vi.spyOn(prismaInstance.tag, 'findUnique').mockImplementation(findUniqueMock)
    vi.spyOn(prismaInstance.tag, 'create').mockImplementation(createMock)
    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance)

    const { res, json } = await fetchHandler((req) => POST(req), 'POST', { name: 'Sweet' })
    expect(res.status).toBe(200)
    expect(json).toEqual({ id: 't2', name: 'Sweet', userId: 'user1' })
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

    const prismaInstance = new PrismaClient()
    const findUniqueMock = vi.fn().mockResolvedValue({ id: 'existing' })
    vi.spyOn(prismaInstance.tag, 'findUnique').mockImplementation(findUniqueMock)
    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance)

    const { res, json } = await fetchHandler((req) => POST(req), 'POST', { name: 'tagtag' })
    expect(res.status).toBe(409)
    expect(json).toHaveProperty('error')
  })
})
