import { GET, POST } from '@/app/api/tags/route'
import * as getCurrentUserMod from '@/lib/getCurrentUser'
import * as prismaMod from '@/lib/prisma'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchHandler } from '../utils/fetchHandler'

vi.mock('@/lib/getCurrentUser')
vi.mock('@/lib/prisma')

describe('api/tags', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('GET returns tags for current user', async () => {
    const mockUser = { id: 'user1' }
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)
    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue({
      tag: {
        findMany: vi.fn().mockResolvedValue([{ id: 't1', name: 'tagtag', userId: 'user1' }]),
      },
    } as any)

    const { res, json } = await fetchHandler(GET)
    expect(res.status).toBe(200)
    expect(json).toEqual([{ id: 't1', name: 'tagtag', userId: 'user1' }])
  })

  it('POST creates tag', async () => {
    const mockUser = { id: 'user1' }
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const createMock = vi.fn().mockResolvedValue({ id: 't2', name: 'Sweet', userId: 'user1' })
    const findUniqueMock = vi.fn().mockResolvedValue(null)

    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue({
      tag: {
        findUnique: findUniqueMock,
        create: createMock,
      },
    } as any)

    const { res, json } = await fetchHandler((req) => POST(req), 'POST', { name: 'Sweet' })
    expect(res.status).toBe(200)
    expect(json).toEqual({ id: 't2', name: 'Sweet', userId: 'user1' })
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
    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue({ tag: { findUnique: findUniqueMock } } as any)

    const { res, json } = await fetchHandler((req) => POST(req), 'POST', { name: 'tagtag' })
    expect(res.status).toBe(409)
    expect(json).toHaveProperty('error')
  })
})
