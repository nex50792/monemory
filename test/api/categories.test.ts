import { GET, POST } from '@/app/api/categories/route'
import * as getCurrentUserMod from '@/lib/getCurrentUser'
import * as prismaMod from '@/lib/prisma'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchHandler } from '../utils/fetchHandler'

vi.mock('@/lib/getCurrentUser')
vi.mock('@/lib/prisma')

describe('api/categories', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('GET returns categories for current user', async () => {
    const mockUser = { id: 'user1' }
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)
    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue({
      category: {
        findMany: vi.fn().mockResolvedValue([{ id: 'c1', name: 'Food', userId: 'user1' }]),
      },
    } as any)

    const { res, json } = await fetchHandler(GET)
    expect(res.status).toBe(200)
    expect(json).toEqual([{ id: 'c1', name: 'Food', userId: 'user1' }])
  })

  it('POST creates category', async () => {
    const mockUser = { id: 'user1' }
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const createMock = vi.fn().mockResolvedValue({ id: 'c2', name: 'Travel', userId: 'user1' })
    const findUniqueMock = vi.fn().mockResolvedValue(null)

    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue({
      category: {
        findUnique: findUniqueMock,
        create: createMock,
      },
    } as any)

    const { res, json } = await fetchHandler((req) => POST(req), 'POST', { name: 'Travel' })
    expect(res.status).toBe(200)
    expect(json).toEqual({ id: 'c2', name: 'Travel', userId: 'user1' })
  })

  it('POST returns 400 for empty name', async () => {
    const mockUser = { id: 'user1' }
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const { res } = await fetchHandler((req) => POST(req), 'POST', { name: '' })
    expect(res.status).toBe(400)
  })

  it('POST returns 409 for duplicate name', async () => {
    const mockUser = { id: 'user1' }
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const findUniqueMock = vi.fn().mockResolvedValue({ id: 'existing' })
    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue({ category: { findUnique: findUniqueMock } } as any)

    const { res, json } = await fetchHandler((req) => POST(req), 'POST', { name: 'Food' })
    expect(res.status).toBe(409)
    expect(json).toHaveProperty('error')
  })
})
