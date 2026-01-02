import * as prismaMod from '@/lib/prisma'
import * as svixMod from 'svix'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma')
vi.mock('svix')

vi.mock('next/headers', () => ({
  headers: () => new Map([['svix-id', '1'], ['svix-timestamp', 't'], ['svix-signature', 's']]),
}))

describe('api/public/webhook', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.CLERK_WEBHOOK_SECRET = 'secret'
  })

  it('returns 201 on user.created', async () => {
    const { POST } = await import('@/app/api/public/webhook/route')

    const verifyMock = vi.fn().mockReturnValue({ type: 'user.created', data: { id: 'c1', email_addresses: [{ email_address: 'a@b' }], first_name: 'F', last_name: 'L' } })
    ;(svixMod as any).Webhook = function () {
      return { verify: verifyMock }
    }

    const createMock = vi.fn().mockResolvedValue({ id: 'u1' })
    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue({ user: { create: createMock } } as any)

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as any)
    expect(res.status).toBe(201)
  })

  it('returns 401 on invalid signature', async () => {
    const { POST } = await import('@/app/api/public/webhook/route')
    ;(svixMod as any).Webhook = function () {
      return { verify: () => { throw new Error('invalid') } }
    }

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })

  it('returns 500 when prisma create fails', async () => {
    const { POST } = await import('@/app/api/public/webhook/route')
    const verifyMock = vi.fn().mockReturnValue({ type: 'user.created', data: { id: 'c1', email_addresses: [{ email_address: 'a@b' }], first_name: 'F', last_name: 'L' } })
    ;(svixMod as any).Webhook = function () {
      return { verify: verifyMock }
    }

    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue({ user: { create: vi.fn().mockRejectedValue(new Error('db fail')) } } as any)

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as any)
    expect(res.status).toBe(500)
  })

  it('returns 500 when webhook secret missing', async () => {
    delete process.env.CLERK_WEBHOOK_SECRET
    const { POST } = await import('@/app/api/public/webhook/route')

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as any)
    expect(res.status).toBe(500)
  })

  it('returns 200 on user.deleted', async () => {
    const { POST } = await import('@/app/api/public/webhook/route')
    ;(svixMod as any).Webhook = function () {
      return { verify: () => ({ type: 'user.deleted', data: { id: 'c1' } }) }
    }

    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue({ user: { updateMany: vi.fn().mockResolvedValue({}) } } as any)

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
  })

  it('returns 500 when prisma delete fails', async () => {
    const { POST } = await import('@/app/api/public/webhook/route')
    ;(svixMod as any).Webhook = function () {
      return { verify: () => ({ type: 'user.deleted', data: { id: 'c1' } }) }
    }

    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue({ user: { updateMany: vi.fn().mockRejectedValue(new Error('db fail')) } } as any)

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as any)
    expect(res.status).toBe(500)
  })

  it('returns 200 on user.updated', async () => {
    const { POST } = await import('@/app/api/public/webhook/route')
    ;(svixMod as any).Webhook = function () {
      return { verify: () => ({ type: 'user.updated', data: { id: 'c1', email_addresses: [{ email_address: 'a@b' }], first_name: 'F', last_name: 'L' } }) }
    }

    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue({ user: { updateMany: vi.fn().mockResolvedValue({}) } } as any)

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
  })

  it('returns 500 when prisma update fails for user.updated', async () => {
    const { POST } = await import('@/app/api/public/webhook/route')
    ;(svixMod as any).Webhook = function () {
      return { verify: () => ({ type: 'user.updated', data: { id: 'c1', email_addresses: [{ email_address: 'a@b' }], first_name: 'F', last_name: 'L' } }) }
    }

    vi.spyOn(prismaMod, 'prisma', 'get').mockReturnValue({ user: { updateMany: vi.fn().mockRejectedValue(new Error('db fail')) } } as any)

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as any)
    expect(res.status).toBe(500)
  })

  it('returns 400 for non user.created events', async () => {
    const { POST } = await import('@/app/api/public/webhook/route')
    ;(svixMod as any).Webhook = function () {
      return { verify: () => ({ type: 'something.else', data: {} }) }
    }

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 when headers missing', async () => {
    vi.doMock('next/headers', () => ({ headers: () => new Map() }))
    const { POST } = await import('@/app/api/public/webhook/route')

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })
})
