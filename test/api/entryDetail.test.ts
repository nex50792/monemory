import { DELETE, GET, PUT } from '@/app/api/entries/[id]/route'
import * as getCurrentUserMod from '@/lib/getCurrentUser'
import * as prismaMod from '@/lib/prisma'
import type { User } from '@prisma/client'
import type { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
    const getCurrentUserSpy = vi.spyOn(getCurrentUserMod, 'getCurrentUser') as ReturnType<typeof vi.spyOn>
    getCurrentUserSpy.mockResolvedValue(mockUser)

    const prismaInstance = {
      entry: { findUnique: vi.fn() },
      category: { upsert: vi.fn() },
      tag: { findFirst: vi.fn(), create: vi.fn() },
    } as any
    const mockEntry = {
      id: 'e1',
      userId: 'user1',
      title: 'Lunch',
      tags: [{ id: 't1', name: 'food' }],
      category: { id: 'c1', name: 'Food' },
    }

    ;(prismaInstance.entry.findUnique as any).mockResolvedValue(mockEntry)
    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance)

    const req = new Request('http://localhost/', { method: 'GET' })
    const res = await GET(req as unknown as NextRequest, { params: Promise.resolve({ id: 'e1' }) })
    const text = await res.text()
    const json = JSON.parse(text)
    expect((res as any).status).toBe(200)
    expect(json).toEqual(mockEntry)
  })

  it('GET returns 404 when entry missing', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const prismaInstance = {
      entry: { findUnique: vi.fn() },
    } as any
    ;(prismaInstance.entry.findUnique as any).mockResolvedValue(null)
    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance)

    const req = new Request('http://localhost/', { method: 'GET' })
    const res = await GET(req as unknown as NextRequest, { params: Promise.resolve({ id: 'missing' }) })
    expect((res as any).status).toBe(404)
  })

  it('PUT updates category and tags', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    const getCurrentUserSpy = vi.spyOn(getCurrentUserMod, 'getCurrentUser') as ReturnType<typeof vi.spyOn>
    getCurrentUserSpy.mockResolvedValue(mockUser)

    const prismaInstance = {
      entry: { findUnique: vi.fn(), update: vi.fn() },
      category: { upsert: vi.fn() },
      tag: { findFirst: vi.fn(), create: vi.fn() },
    } as any

    ;(prismaInstance.entry.findUnique as any).mockResolvedValue({ id: 'e1', userId: 'user1' })

    ;(prismaInstance.category.upsert as any).mockResolvedValue({ id: 'c2', name: 'NewCat' })

    ;(prismaInstance.tag.findFirst as any).mockResolvedValue(null)
    ;(prismaInstance.tag.create as any).mockImplementation((args: any) => Promise.resolve({ id: 't-new', name: args.data.name }))

    const updatedEntry = { id: 'e1', title: 'Updated', userId: 'user1', category: { id: 'c2', name: 'NewCat' }, tags: [{ id: 't-new', name: 'new' }] }
    ;(prismaInstance.entry.update as any).mockResolvedValue(updatedEntry)

    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance)

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
    })
    const res = await PUT(req as unknown as NextRequest, { params: Promise.resolve({ id: 'e1' }) })
    const text = await res.text()
    const json = JSON.parse(text)
    expect((res as any).status).toBe(200)
    expect(json).toEqual(updatedEntry)

    expect(prismaInstance.category.upsert).toHaveBeenCalled()
    expect(prismaInstance.tag.create).toHaveBeenCalled()
    expect(prismaInstance.entry.update).toHaveBeenCalled()
  })

  it('PUT handles invalid date and amount normalization', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    const getCurrentUserSpy = vi.spyOn(getCurrentUserMod, 'getCurrentUser') as ReturnType<typeof vi.spyOn>
    getCurrentUserSpy.mockResolvedValue(mockUser)

    const prismaInstance = {
      entry: { findUnique: vi.fn(), update: vi.fn() },
      category: { upsert: vi.fn() },
      tag: { findFirst: vi.fn(), create: vi.fn() },
    } as any

    ;(prismaInstance.entry.findUnique as any).mockResolvedValue({ id: 'e1', userId: 'user1' })
    ;(prismaInstance.category.upsert as any).mockResolvedValue({ id: 'c2', name: 'NewCat' })
    ;(prismaInstance.tag.findFirst as any).mockResolvedValue(null)
    ;(prismaInstance.tag.create as any).mockImplementation((args: any) => Promise.resolve({ id: 't-new', name: args.data.name }))
    ;(prismaInstance.entry.update as any).mockResolvedValue({ id: 'e1' })

    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance)

    const body = { date: 'invalid-date', amount: 'not-a-number', newCategory: '', newTags: '' }
    const req = new Request('http://localhost/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const res = await PUT(req as unknown as NextRequest, { params: Promise.resolve({ id: 'e1' }) })
    expect((res as any).status).toBe(200)
  })

  it('PUT uses existing categoryId and mixes existing/new tags', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const prismaInstance = {
      entry: { findUnique: vi.fn(), update: vi.fn() },
      category: { upsert: vi.fn() },
      tag: { findFirst: vi.fn(), create: vi.fn() },
    } as any

    ;(prismaInstance.entry.findUnique as any).mockResolvedValue({ id: 'e1', userId: 'user1' })

    vi.spyOn(prismaInstance.category, 'upsert' as any)

    ;(prismaInstance.tag.findFirst as any).mockImplementation(({ where }: any) => {
      return Promise.resolve(where.name === 'exists' ? { id: 't-ex', name: 'exists' } : null)
    })
    ;(prismaInstance.tag.create as any).mockImplementation((args: any) => Promise.resolve({ id: 't-new', name: args.data.name }))

    ;(prismaInstance.entry.update as any).mockResolvedValue({ id: 'e1', category: { id: 'c-ex' }, tags: [{ id: 't-ex' }, { id: 't-new' }] })

    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance)

    const body = { title: 'Mix', categoryId: 'c-ex', tags: 'exists', newTags: ['new'] }
    const req = new Request('http://localhost/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const res = await PUT(req as unknown as NextRequest, { params: Promise.resolve({ id: 'e1' }) })
    expect((res as any).status).toBe(200)

    expect(prismaInstance.category.upsert).not.toHaveBeenCalled()
    expect(prismaInstance.tag.create).toHaveBeenCalled()

    const updateCall = (prismaInstance.entry.update as any).mock.calls[0][0]
    expect(updateCall.data.tags.set).toEqual([{ id: 'exists' }, { id: 't-new' }])
  })

  it('PUT returns 404 when entry not found', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const prismaInstance = {
      entry: { findUnique: vi.fn() },
    } as any
    ;(prismaInstance.entry.findUnique as any).mockResolvedValue(null)
    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance)

    const body = { title: 'NoEntry' }
    const req = new Request('http://localhost/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const res = await PUT(req as any, { params: Promise.resolve({ id: 'missing' }) })
    expect((res as any).status).toBe(404)
  })

  it('PUT creates multiple new tags from comma-separated newTags and accepts tags as array', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const prismaInstance = {
      entry: { findUnique: vi.fn(), update: vi.fn() },
      category: { upsert: vi.fn() },
      tag: { findFirst: vi.fn(), create: vi.fn() },
    } as any

    ;(prismaInstance.entry.findUnique as any).mockResolvedValue({ id: 'e1', userId: 'user1' })

    ;(prismaInstance.tag.findFirst as any).mockResolvedValue(null)
    let createCount = 0
    ;(prismaInstance.tag.create as any).mockImplementation((args: any) => {
      createCount += 1
      return Promise.resolve({ id: `t-new-${createCount}`, name: args.data.name })
    })

    ;(prismaInstance.entry.update as any).mockResolvedValue({ id: 'e1', tags: [{ id: 't-new-1' }, { id: 't-new-2' }] })
    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance)

    const body = { title: 'Multi', categoryId: null, tags: ['s1','s2'], newTags: 'a,b' }
    const req = new Request('http://localhost/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const res = await PUT(req as any, { params: Promise.resolve({ id: 'e1' }) })
    expect((res as any).status).toBe(200)
    expect(prismaInstance.tag.create).toHaveBeenCalledTimes(2)
    const updateCall = (prismaInstance.entry.update as any).mock.calls[0][0]
    expect(updateCall.data.tags.set).toEqual([{ id: 's1' }, { id: 's2' }, { id: 't-new-1' }, { id: 't-new-2' }])
  })

  it('DELETE returns 404 when not owner', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const prismaInstance = { entry: { findUnique: vi.fn() } } as any
    ;(prismaInstance.entry.findUnique as any).mockResolvedValue({ id: 'e1', userId: 'other' })
    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance)

    const res = await DELETE(new Request('http://localhost/') as unknown as NextRequest, { params: Promise.resolve({ id: 'e1' }) })
    expect((res as any).status).toBe(404)
  })

  it('DELETE deletes when owner', async () => {
    const mockUser = makeMockUser({ id: 'user1' })
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser)

    const prismaInstance = { entry: { findUnique: vi.fn(), delete: vi.fn() } } as any
    ;(prismaInstance.entry.findUnique as any).mockResolvedValue({ id: 'e1', userId: 'user1' })
    ;(prismaInstance.entry.delete as any).mockResolvedValue({ id: 'e1' })
    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue(prismaInstance)

    const res = await DELETE(new Request('http://localhost/') as unknown as NextRequest, { params: Promise.resolve({ id: 'e1' }) })
    expect((res as any).status).toBe(200)
  })
})
