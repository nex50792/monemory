import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type TestUserDelegate = Partial<{
  create: ReturnType<typeof vi.fn>
  updateMany: ReturnType<typeof vi.fn>
}>;

type PartialPrisma = Partial<{
  user: TestUserDelegate
}>;

vi.mock('next/headers', () => ({
  headers: () => new Map([['svix-id', '1'], ['svix-timestamp', 't'], ['svix-signature', 's']]),
}))

describe('api/public/webhook', () => {
  function mockPrismaModule(prismaInstance: PartialPrisma) {
    vi.doMock('@/lib/prisma', () => ({ prisma: prismaInstance }))
  }
  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
    process.env.CLERK_WEBHOOK_SECRET = 'secret'
  })

  it('returns 201 on user.created', async () => {
    const verifyMock = vi.fn().mockReturnValue({ type: 'user.created', data: { id: 'c1', email_addresses: [{ email_address: 'a@b' }], first_name: 'F', last_name: 'L' } })
    const createMock = vi.fn().mockResolvedValue({ id: 'u1' })
    const prismaInstance: PartialPrisma = { user: { create: createMock } }
    mockPrismaModule(prismaInstance)
    vi.doMock('svix', () => ({ Webhook: class { constructor() {} verify = verifyMock } }))
    const { POST } = await import('@/app/api/public/webhook/route')

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as NextRequest)
    expect(res.status).toBe(201)
  })

  it('returns 401 on invalid signature', async () => {
    vi.doMock('svix', () => ({ Webhook: class { constructor() {} verify() { throw new Error('invalid') } } }))
    const { POST } = await import('@/app/api/public/webhook/route')

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as NextRequest)
    expect(res.status).toBe(401)
  })

  it('returns 500 when prisma create fails', async () => {
    const verifyMock = vi.fn().mockReturnValue({ type: 'user.created', data: { id: 'c1', email_addresses: [{ email_address: 'a@b' }], first_name: 'F', last_name: 'L' } })
    const createMock = vi.fn().mockRejectedValue(new Error('db fail'))
    const prismaInstance: PartialPrisma = { user: { create: createMock } }
    mockPrismaModule(prismaInstance)
    vi.doMock('svix', () => ({ Webhook: class { constructor() {} verify = verifyMock } }))
    const { POST } = await import('@/app/api/public/webhook/route')

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as NextRequest)
    expect(res.status).toBe(500)
  })

  it('returns 500 when webhook secret missing', async () => {
    delete process.env.CLERK_WEBHOOK_SECRET
    const { POST } = await import('@/app/api/public/webhook/route')

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as NextRequest)
    expect(res.status).toBe(500)
  })

  it('returns 200 on user.deleted', async () => {
    const updateManyMock = vi.fn().mockResolvedValue({})
    const prismaInstance: PartialPrisma = { user: { updateMany: updateManyMock } }
    mockPrismaModule(prismaInstance)
    vi.doMock('svix', () => ({ Webhook: class { constructor() {} verify() { return { type: 'user.deleted', data: { id: 'c1' } } } } }))
    const { POST } = await import('@/app/api/public/webhook/route')

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as NextRequest)
    expect(res.status).toBe(200)
  })

  it('returns 500 when prisma delete fails', async () => {
    const updateManyMock = vi.fn().mockRejectedValue(new Error('db fail'))
    const prismaInstance: PartialPrisma = { user: { updateMany: updateManyMock } }
    mockPrismaModule(prismaInstance)
    vi.doMock('svix', () => ({ Webhook: class { constructor() {} verify() { return { type: 'user.deleted', data: { id: 'c1' } } } } }))
    const { POST } = await import('@/app/api/public/webhook/route')

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as NextRequest)
    expect(res.status).toBe(500)
  })

  it('returns 200 on user.updated', async () => {
    const updateManyMock = vi.fn().mockResolvedValue({})
    const prismaInstance: PartialPrisma = { user: { updateMany: updateManyMock } }
    mockPrismaModule(prismaInstance)
    vi.doMock('svix', () => ({ Webhook: class { constructor() {} verify() { return { type: 'user.updated', data: { id: 'c1', email_addresses: [{ email_address: 'a@b' }], first_name: 'F', last_name: 'L' } } } } } ))
    const { POST } = await import('@/app/api/public/webhook/route')

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as NextRequest)
    expect(res.status).toBe(200)
  })

  it('returns 500 when prisma update fails for user.updated', async () => {
    const updateManyMock = vi.fn().mockRejectedValue(new Error('db fail'))
    const prismaInstance: PartialPrisma = { user: { updateMany: updateManyMock } }
    mockPrismaModule(prismaInstance)
    vi.doMock('svix', () => ({ Webhook: class { constructor() {} verify() { return { type: 'user.updated', data: { id: 'c1', email_addresses: [{ email_address: 'a@b' }], first_name: 'F', last_name: 'L' } } } } } ))
    const { POST } = await import('@/app/api/public/webhook/route')

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as NextRequest)
    expect(res.status).toBe(500)
  })

  it('returns 400 for non user.created events', async () => {
    vi.doMock('svix', () => ({ Webhook: class { constructor() {} verify() { return { type: 'something.else', data: {} } } } }))
    const { POST } = await import('@/app/api/public/webhook/route')

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as NextRequest)
    expect(res.status).toBe(400)
  })

  it('returns 400 when verify returns undefined', async () => {
    vi.doMock('svix', () => ({ Webhook: class { constructor() {} verify() { return undefined } } }))
    const { POST } = await import('@/app/api/public/webhook/route')

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as NextRequest)
    expect(res.status).toBe(400)
  })

  it('returns 400 when event data id missing', async () => {
    const verifyMock = vi.fn().mockReturnValue({ type: 'user.created', data: {} })
    vi.doMock('svix', () => ({ Webhook: class { constructor() {} verify = verifyMock } }))
    const { POST } = await import('@/app/api/public/webhook/route')

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as NextRequest)
    expect(res.status).toBe(400)
  })

  it('returns 400 when headers missing', async () => {
    vi.doMock('next/headers', () => ({ headers: () => new Map() }))
    const { POST } = await import('@/app/api/public/webhook/route')

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as NextRequest)
    expect(res.status).toBe(400)
  })

  it('returns 400 when verify returns undefined', async () => {
    vi.doMock('svix', () => ({ Webhook: class { constructor() {} verify() { return undefined } } }))
    const { POST } = await import('@/app/api/public/webhook/route')

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as NextRequest)
    expect(res.status).toBe(400)
  })

  it('user.created with missing name/email passes nulls to prisma.create', async () => {
    const verifyMock = vi.fn().mockReturnValue({ type: 'user.created', data: { id: 'c2' } })
    const createMock = vi.fn().mockResolvedValue({ id: 'u2' })
    const prismaInstance: PartialPrisma = { user: { create: createMock } }
    mockPrismaModule(prismaInstance)
    vi.doMock('next/headers', () => ({ headers: () => new Map([['svix-id', '1'], ['svix-timestamp', 't'], ['svix-signature', 's']]) }))
    vi.doMock('svix', () => ({ Webhook: class { constructor() {} verify = verifyMock } }))
    const { POST } = await import('@/app/api/public/webhook/route')

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as NextRequest)
    expect(res.status).toBe(201)
    expect(createMock).toHaveBeenCalledWith({ data: { clerkUserId: 'c2', email: null, name: null } })
  })
})
