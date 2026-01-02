import { GET } from '@/app/api/entries/route'
import * as getCurrentUserMod from '@/lib/getCurrentUser'
import * as prismaMod from '@/lib/prisma'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchHandler } from '../utils/fetchHandler'

vi.mock('@/lib/getCurrentUser')
vi.mock('@/lib/prisma')

describe('api/entries', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('GET returns entries for current user', async () => {
    const mockUser = { id: 'user1' }
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)
    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue({
      entry: {
        findMany: vi.fn().mockResolvedValue([{ id: 'e1', title: 'Lunch', userId: 'user1' }]),
      },
    } as any)

    const { res, json } = await fetchHandler(GET)
    expect(res.status).toBe(200)
    expect(json).toEqual([{ id: 'e1', title: 'Lunch', userId: 'user1' }])
  })

  it('returns 401 when not authenticated', async () => {
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(null)
    const { res } = await fetchHandler(GET)
    expect(res.status).toBe(401)
  })

  it('returns empty array when no entries', async () => {
    const mockUser = { id: 'user1' }
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)
    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue({ entry: { findMany: vi.fn().mockResolvedValue([]) } } as any)

    const { res, json } = await fetchHandler(GET)
    expect(res.status).toBe(200)
    expect(json).toEqual([])
  })
})
