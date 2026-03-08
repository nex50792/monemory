import { DELETE, GET, PUT } from '@/app/api/entries/[id]/route';
import { UnauthorizedError } from '@/lib/errors';
import * as getCurrentUserMod from '@/lib/getCurrentUser';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/getCurrentUser');

let prisma: PrismaClient;

describe('api/entries/[id]', () => {
  beforeEach(async () => {
    prisma = new PrismaClient();
    vi.resetAllMocks();

    const user = await prisma.user.create({
      data: {
        clerkUserId: 'clerk_user1',
        isAdmin: false,
      },
    });

    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(user);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET returns entry with tags and category', async () => {
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('User not found');

    const category = await prisma.category.create({
      data: { name: 'Food', userId: user.id },
    });

    const tag = await prisma.tag.create({
      data: { name: 'food', userId: user.id },
    });

    const entry = await prisma.entry.create({
      data: {
        title: 'Lunch',
        userId: user.id,
        categoryId: category.id,
        tags: { connect: [{ id: tag.id }] },
      },
      include: { tags: true, category: true },
    });

    const req = new Request('http://localhost/', { method: 'GET' });
    const res = await GET(req, { params: Promise.resolve({ id: entry.id }) });
    const text = await res.text();
    const json = JSON.parse(text);

    expect(res.status).toBe(200);
    expect(json.id).toBe(entry.id);
    expect(json.title).toBe('Lunch');
    expect(json.category.name).toBe('Food');
    expect(json.tags).toHaveLength(1);
    expect(json.tags[0].name).toBe('food');
  });

  it('GET returns 404 when entry missing', async () => {
    const req = new Request('http://localhost/', { method: 'GET' });
    const res = await GET(req, { params: Promise.resolve({ id: 'missing' }) });
    expect(res.status).toBe(404);
  });

  it('PUT updates category and tags', async () => {
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('User not found');

    const category1 = await prisma.category.create({
      data: { name: 'Food', userId: user.id },
    });

    const tag1 = await prisma.tag.create({
      data: { name: 'old', userId: user.id },
    });

    const entry = await prisma.entry.create({
      data: {
        title: 'Lunch',
        userId: user.id,
        categoryId: category1.id,
        tags: { connect: [{ id: tag1.id }] },
      },
    });

    const newCategory = await prisma.category.create({
      data: { name: 'NewCat', userId: user.id },
    });

    const newTag = await prisma.tag.create({
      data: { name: 'new', userId: user.id },
    });

    const body = {
      title: 'Updated',
      categoryId: newCategory.id,
      tags: [tag1.id, newTag.id],
    };

    const req = new Request('http://localhost/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: entry.id }) });
    expect(res.status).toBe(200);

    const updated = await prisma.entry.findUnique({
      where: { id: entry.id },
      include: { tags: true, category: true },
    });

    expect(updated?.title).toBe('Updated');
    expect(updated?.category?.id).toBe(newCategory.id);
    expect(updated?.tags.map((t) => t.name)).toContain('new');
  });

  it('PUT returns 404 when entry not found', async () => {
    const body = { title: 'NoEntry' };
    const req = new Request('http://localhost/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: 'missing' }) });
    expect(res.status).toBe(404);
  });

  it('DELETE returns 404 when not owner', async () => {
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('User not found');

    const otherUser = await prisma.user.create({
      data: { clerkUserId: 'clerk_other', isAdmin: false },
    });

    const entry = await prisma.entry.create({
      data: { title: 'Other Entry', userId: otherUser.id },
    });

    const res = await DELETE(new Request('http://localhost/'), {
      params: Promise.resolve({ id: entry.id }),
    });

    expect(res.status).toBe(404);
  });

  it('DELETE deletes when owner', async () => {
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('User not found');

    const entry = await prisma.entry.create({
      data: { title: 'My Entry', userId: user.id },
    });

    const res = await DELETE(new Request('http://localhost/'), {
      params: Promise.resolve({ id: entry.id }),
    });

    expect(res.status).toBe(200);

    const deleted = await prisma.entry.findUnique({ where: { id: entry.id } });
    expect(deleted).toBeNull();
  });

  it('GET returns 401 when not authenticated', async () => {
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockRejectedValue(new UnauthorizedError());
    const res = await GET(new Request('http://localhost/'), {
      params: Promise.resolve({ id: 'any' }),
    });
    expect(res.status).toBe(401);
  });

  it('PUT returns 401 when not authenticated', async () => {
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockRejectedValue(new UnauthorizedError());
    const req = new Request('http://localhost/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test' }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: 'any' }) });
    expect(res.status).toBe(401);
  });

  it('DELETE returns 401 when not authenticated', async () => {
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockRejectedValue(new UnauthorizedError());
    const res = await DELETE(new Request('http://localhost/'), {
      params: Promise.resolve({ id: 'any' }),
    });
    expect(res.status).toBe(401);
  });
});
