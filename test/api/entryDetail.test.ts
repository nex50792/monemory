import { GET, PUT } from '@/app/api/entries/[id]/route'
import * as getCurrentUserMod from '@/lib/getCurrentUser'
import * as prismaMod from '@/lib/prisma'
import type { User } from '@prisma/client'
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
    const res = await GET(req as any, { params: Promise.resolve({ id: 'e1' }) })
    const text = await res.text()
    const json = JSON.parse(text)
    expect((res as any).status).toBe(200)
    expect(json).toEqual(mockEntry)
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
    const res = await PUT(req as any, { params: Promise.resolve({ id: 'e1' }) })
    const text = await res.text()
    const json = JSON.parse(text)
    expect((res as any).status).toBe(200)
    expect(json).toEqual(updatedEntry)

    expect(prismaInstance.category.upsert).toHaveBeenCalled()
    expect(prismaInstance.tag.create).toHaveBeenCalled()
    expect(prismaInstance.entry.update).toHaveBeenCalled()
  })
})
