import { DELETE, GET, PUT } from '@/app/api/entries/[id]/route'
import * as getCurrentUserMod from '@/lib/getCurrentUser'
import * as prismaMod from '@/lib/prisma'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type Fn = ReturnType<typeof vi.fn>

type RealPrismaClient = import('@prisma/client').PrismaClient

type PrismaTestClient = RealPrismaClient & {
  entry: {
    findUnique: Fn
    update?: Fn
    delete?: Fn
  }
  category?: {
    upsert?: Fn
  }
  tag?: {
    findFirst?: Fn
    create?: Fn
  }
}
interface User {
  id: string
  name: string | null
  clerkUserId: string
  email: string | null
  isAdmin: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

vi.mock('@/lib/getCurrentUser')
vi.mock('@/lib/prisma')

describe('api/entries/[id]', () => {
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

  it('GET returns entry with tags and category', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const findUnique = vi.fn()
    const prismaInstance = {
      entry: { findUnique },
      category: { upsert: vi.fn() },
      tag: { findFirst: vi.fn(), create: vi.fn() },
    }

    const mockEntry = {
      id: 'e1',
      userId: 'user1',
      title: 'Lunch',
      tags: [{ id: 't1', name: 'food' }],
      category: { id: 'c1', name: 'Food' },
    }

    findUnique.mockResolvedValue(mockEntry)
        vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance as PrismaTestClient)

    const req = new Request('http://localhost/', { method: 'GET' }) as Request
    const res = await GET(req, { params: Promise.resolve({ id: 'e1' }) })
    const text = await res.text()
    const json = JSON.parse(text)
    expect(res.status).toBe(200)
    expect(json).toEqual(mockEntry)
  })

  it('GET returns 404 when entry missing', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const findUnique = vi.fn()
    const prismaInstance = { entry: { findUnique } }
    findUnique.mockResolvedValue(null)
        vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance as PrismaTestClient)

    const req = new Request('http://localhost/', { method: 'GET' }) as Request
    const res = await GET(req, { params: Promise.resolve({ id: 'missing' }) })
    expect(res.status).toBe(404)
  })

  it('PUT updates category and tags', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const findUnique = vi.fn()
    const update = vi.fn()
    const upsert = vi.fn()
    const tagFindFirst = vi.fn()
    const tagCreate = vi.fn()

    const prismaInstance = {
      entry: { findUnique, update },
      category: { upsert },
      tag: { findFirst: tagFindFirst, create: tagCreate },
    }

    findUnique.mockResolvedValue({ id: 'e1', userId: 'user1' })
    upsert.mockResolvedValue({ id: 'c2', name: 'NewCat' })
    tagFindFirst.mockResolvedValue(null)
    tagCreate.mockImplementation((args: { data: { name: string } }) => Promise.resolve({ id: 't-new', name: args.data.name }))
    const updatedEntry = { id: 'e1', title: 'Updated', userId: 'user1', category: { id: 'c2', name: 'NewCat' }, tags: [{ id: 't-new', name: 'new' }] }
    update.mockResolvedValue(updatedEntry)

        vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance as PrismaTestClient)

    const body = {
      title: 'Updated',
      categoryId: null,
      newCategory: 'NewCat',
      tags: 't-old',
      newTags: ['new'],
    }

    const req = new Request('http://localhost/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as Request
    const res = await PUT(req, { params: Promise.resolve({ id: 'e1' }) })
    const text = await res.text()
    const json = JSON.parse(text)
    expect(res.status).toBe(200)
    expect(json).toEqual(updatedEntry)

    expect(upsert).toHaveBeenCalled()
    expect(tagCreate).toHaveBeenCalled()
    expect(update).toHaveBeenCalled()
  })

  it('PUT handles invalid date and amount normalization', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const findUnique = vi.fn()
    const update = vi.fn()
    const upsert = vi.fn()
    const tagFindFirst = vi.fn()
    const tagCreate = vi.fn()

    const prismaInstance = {
      entry: { findUnique, update },
      category: { upsert },
      tag: { findFirst: tagFindFirst, create: tagCreate },
    }

    findUnique.mockResolvedValue({ id: 'e1', userId: 'user1' })
    upsert.mockResolvedValue({ id: 'c2', name: 'NewCat' })
    tagFindFirst.mockResolvedValue(null)
    tagCreate.mockImplementation((args: { data: { name: string } }) => Promise.resolve({ id: 't-new', name: args.data.name }))
    update.mockResolvedValue({ id: 'e1' })

        vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance as PrismaTestClient)

    const body = { date: 'invalid-date', amount: 'not-a-number', newCategory: '', newTags: '' }
    const req = new Request('http://localhost/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as Request
    const res = await PUT(req, { params: Promise.resolve({ id: 'e1' }) })
    expect(res.status).toBe(200)
  })

  it('PUT uses existing categoryId and mixes existing/new tags', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const findUnique = vi.fn()
    const update = vi.fn()
    const upsert = vi.fn()
    const tagFindFirst = vi.fn()
    const tagCreate = vi.fn()

    const prismaInstance = {
      entry: { findUnique, update },
      category: { upsert },
      tag: { findFirst: tagFindFirst, create: tagCreate },
    }

    findUnique.mockResolvedValue({ id: 'e1', userId: 'user1' })

    tagFindFirst.mockImplementation(({ where }: { where: { name: string } }) => Promise.resolve(where.name === 'exists' ? { id: 't-ex', name: 'exists' } : null))
    tagCreate.mockImplementation((args: { data: { name: string } }) => Promise.resolve({ id: 't-new', name: args.data.name }))
    update.mockResolvedValue({ id: 'e1', category: { id: 'c-ex' }, tags: [{ id: 't-ex' }, { id: 't-new' }] })

        vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance as PrismaTestClient)

    const body = { title: 'Mix', categoryId: 'c-ex', tags: 'exists', newTags: ['new'] }
    const req = new Request('http://localhost/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as Request
    const res = await PUT(req, { params: Promise.resolve({ id: 'e1' }) })
    expect(res.status).toBe(200)

    expect(upsert).not.toHaveBeenCalled()
    expect(tagCreate).toHaveBeenCalled()

    const calls = (update as Fn)?.mock?.calls
    const updateCall = calls && calls[0] ? calls[0][0] : undefined
    if (updateCall) {
      expect(updateCall.data.tags.set).toEqual([{ id: 'exists' }, { id: 't-new' }])
    }
  })

  it('PUT returns 404 when entry not found', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const findUnique = vi.fn()
    const prismaInstance = { entry: { findUnique } }
    findUnique.mockResolvedValue(null)
        vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance as PrismaTestClient)

    const body = { title: 'NoEntry' }
    const req = new Request('http://localhost/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as Request
    const res = await PUT(req, { params: Promise.resolve({ id: 'missing' }) })
    expect(res.status).toBe(404)
  })

  it('PUT creates multiple new tags from comma-separated newTags and accepts tags as array', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const findUnique = vi.fn()
    const update = vi.fn()
    const tagFindFirst = vi.fn()
    const tagCreate = vi.fn()

    const prismaInstance = {
      entry: { findUnique, update },
      category: { upsert: vi.fn() },
      tag: { findFirst: tagFindFirst, create: tagCreate },
    }

    findUnique.mockResolvedValue({ id: 'e1', userId: 'user1' })
    tagFindFirst.mockResolvedValue(null)
    let createCount = 0
    tagCreate.mockImplementation((args: { data: { name: string } }) => {
      createCount += 1
      return Promise.resolve({ id: `t-new-${createCount}`, name: args.data.name })
    })

    update.mockResolvedValue({ id: 'e1', tags: [{ id: 't-new-1' }, { id: 't-new-2' }] })
        vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance as PrismaTestClient)

    const body = { title: 'Multi', categoryId: null, tags: ['s1', 's2'], newTags: 'a,b' }
    const req = new Request('http://localhost/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as Request
    const res = await PUT(req, { params: Promise.resolve({ id: 'e1' }) })
    expect(res.status).toBe(200)
    expect(tagCreate).toHaveBeenCalledTimes(2)
        const updateCall = (update as Fn).mock.calls[0][0]
    expect(updateCall.data.tags.set).toEqual([{ id: 's1' }, { id: 's2' }, { id: 't-new-1' }, { id: 't-new-2' }])
  })

  it('DELETE returns 404 when not owner', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const findUnique = vi.fn()
    const prismaInstance = { entry: { findUnique } }
    findUnique.mockResolvedValue({ id: 'e1', userId: 'other' })
        vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance as PrismaTestClient)

    const res = await DELETE(new Request('http://localhost/') as Request, { params: Promise.resolve({ id: 'e1' }) })
    expect(res.status).toBe(404)
  })

  it('DELETE deletes when owner', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const findUnique = vi.fn()
    const del = vi.fn()
    const prismaInstance = { entry: { findUnique, delete: del } }
    findUnique.mockResolvedValue({ id: 'e1', userId: 'user1' })
    del.mockResolvedValue({ id: 'e1' })
        vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance as PrismaTestClient)

    const res = await DELETE(new Request('http://localhost/') as Request, { params: Promise.resolve({ id: 'e1' }) })
    expect(res.status).toBe(200)
  })
})
