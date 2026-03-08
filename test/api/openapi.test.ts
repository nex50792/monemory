/* eslint-disable @typescript-eslint/no-explicit-any */
import * as getCurrentUserMod from '@/lib/getCurrentUser';
import type { User } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import jsYaml from 'js-yaml';
import OpenAPIResponseValidator from 'openapi-response-validator';
import { join } from 'path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchHandler } from '../utils/fetchHandler';

vi.mock('@/lib/getCurrentUser');

const specRaw = readFileSync(join(process.cwd(), 'public', 'api_reference', 'openapi.yaml'), 'utf-8');
const spec = jsYaml.load(specRaw) as any;

/** $ref を再帰的に解決する */
function resolveRefs(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj.$ref) {
    const refPath = obj.$ref.replace('#/', '').split('/');
    let resolved: any = spec;
    for (const part of refPath) resolved = resolved[part];
    return resolveRefs(resolved);
  }
  if (Array.isArray(obj)) return obj.map(resolveRefs);
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, resolveRefs(v)]));
}

/** OpenAPIのパス定義からレスポンスバリデーターを生成 */
function createValidator(path: string, method: string) {
  const operation = resolveRefs(spec.paths[path][method]);
  return new OpenAPIResponseValidator({ responses: operation.responses, components: resolveRefs(spec.components) });
}

/** レスポンスを検証し、エラーがあればfailする */
function assertSchemaConform(validator: OpenAPIResponseValidator, status: number, body: any, label: string) {
  const errors = validator.validateResponse(status, body);
  expect(errors, `${label}: レスポンスがOpenAPIスキーマに一致しない - ${JSON.stringify(errors)}`).toBeUndefined();
}

let prisma: PrismaClient;

describe('OpenAPIスキーマとAPIレスポンスの整合性', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    prisma = new PrismaClient();

    await prisma.entry.deleteMany().catch(() => {});
    await prisma.tag.deleteMany().catch(() => {});
    await prisma.category.deleteMany().catch(() => {});
    await prisma.user.deleteMany().catch(() => {});

    await prisma.user.create({
      data: {
        id: 'user1', clerkUserId: 'clerk_user1', name: null, email: null,
        isAdmin: false, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const mockUser = (): User => ({
    id: 'user1', name: null, clerkUserId: 'clerk_user1', email: null,
    isAdmin: false, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
  });

  it('GET /entries - 200レスポンスがスキーマ準拠', async () => {
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser());

    await prisma.category.create({ data: { id: 'cat1', name: '食費', userId: 'user1' } });
    await prisma.tag.create({ data: { id: 'tag1', name: '外食', userId: 'user1' } });
    await prisma.entry.create({
      data: {
        id: 'e1', title: 'ランチ', userId: 'user1', amount: 1200,
        date: new Date('2026-01-15'), memo: 'おいしかった',
        categoryId: 'cat1', tags: { connect: [{ id: 'tag1' }] },
      },
    });

    const { GET } = await import('@/app/api/entries/route');
    const { res, json } = await fetchHandler(GET);
    expect(res.status).toBe(200);

    const validator = createValidator('/entries', 'get');
    assertSchemaConform(validator, 200, json, 'GET /entries');
  });

  it('GET /entries - 401レスポンスがスキーマ準拠', async () => {
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockRejectedValue(
      new (await import('@/lib/errors')).UnauthorizedError()
    );

    const { GET } = await import('@/app/api/entries/route');
    const { res, json } = await fetchHandler(GET);
    expect(res.status).toBe(401);

    const validator = createValidator('/entries', 'get');
    assertSchemaConform(validator, 401, json, 'GET /entries 401');
  });

  it('GET /categories - 200レスポンスがスキーマ準拠', async () => {
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser());
    await prisma.category.create({ data: { id: 'cat1', name: '食費', userId: 'user1' } });

    const { GET } = await import('@/app/api/categories/route');
    const { res, json } = await fetchHandler(GET);
    expect(res.status).toBe(200);

    const validator = createValidator('/categories', 'get');
    assertSchemaConform(validator, 200, json, 'GET /categories');
  });

  it('POST /categories - 200レスポンスがスキーマ準拠', async () => {
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser());

    const { POST } = await import('@/app/api/categories/route');
    const { res, json } = await fetchHandler(POST, 'POST', { name: '交通費' });
    expect(res.status).toBe(200);

    const validator = createValidator('/categories', 'post');
    assertSchemaConform(validator, 200, json, 'POST /categories');
  });

  it('POST /categories - 400レスポンスがスキーマ準拠', async () => {
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser());

    const { POST } = await import('@/app/api/categories/route');
    const { res, json } = await fetchHandler(POST, 'POST', { name: '' });
    expect(res.status).toBe(400);

    const validator = createValidator('/categories', 'post');
    assertSchemaConform(validator, 400, json, 'POST /categories 400');
  });

  it('POST /categories - 409レスポンスがスキーマ準拠', async () => {
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser());
    await prisma.category.create({ data: { id: 'dup1', name: '食費', userId: 'user1' } });

    const { POST } = await import('@/app/api/categories/route');
    const { res, json } = await fetchHandler(POST, 'POST', { name: '食費' });
    expect(res.status).toBe(409);

    const validator = createValidator('/categories', 'post');
    assertSchemaConform(validator, 409, json, 'POST /categories 409');
  });

  it('GET /tags - 200レスポンスがスキーマ準拠', async () => {
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser());
    await prisma.tag.create({ data: { id: 'tag1', name: '外食', userId: 'user1' } });

    const { GET } = await import('@/app/api/tags/route');
    const { res, json } = await fetchHandler(GET);
    expect(res.status).toBe(200);

    const validator = createValidator('/tags', 'get');
    assertSchemaConform(validator, 200, json, 'GET /tags');
  });

  it('POST /tags - 200レスポンスがスキーマ準拠', async () => {
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser());

    const { POST } = await import('@/app/api/tags/route');
    const { res, json } = await fetchHandler(POST, 'POST', { name: '旅行' });
    expect(res.status).toBe(200);

    const validator = createValidator('/tags', 'post');
    assertSchemaConform(validator, 200, json, 'POST /tags');
  });

  it('GET /stats - monthlyレスポンスがスキーマ準拠', async () => {
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser());
    await prisma.entry.create({
      data: { id: 'se1', title: 'Test', userId: 'user1', amount: 1000, date: new Date('2026-01-15') },
    });

    const { GET } = await import('@/app/api/stats/route');
    const req = new Request('http://localhost/?type=monthly&startDate=2026-01-01&endDate=2026-01-31');
    const res = await GET(req);
    const json = JSON.parse(await res.text());
    expect(res.status).toBe(200);

    const validator = createValidator('/stats', 'get');
    assertSchemaConform(validator, 200, json, 'GET /stats monthly');
  });

  it('GET /stats - categoryレスポンスがスキーマ準拠', async () => {
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser());
    await prisma.category.create({ data: { id: 'scat1', name: '食費', userId: 'user1' } });
    await prisma.entry.create({
      data: { id: 'se2', title: 'Test', userId: 'user1', amount: 2000, date: new Date('2026-01-15'), categoryId: 'scat1' },
    });

    const { GET } = await import('@/app/api/stats/route');
    const req = new Request('http://localhost/?type=category&startDate=2026-01-01&endDate=2026-01-31');
    const res = await GET(req);
    const json = JSON.parse(await res.text());
    expect(res.status).toBe(200);

    const validator = createValidator('/stats', 'get');
    assertSchemaConform(validator, 200, json, 'GET /stats category');
  });

  it('GET /entries/{id} - 200レスポンスがスキーマ準拠', async () => {
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser());

    await prisma.category.create({ data: { id: 'cat2', name: '交通費', userId: 'user1' } });
    await prisma.tag.create({ data: { id: 'tag2', name: '通勤', userId: 'user1' } });
    await prisma.entry.create({
      data: {
        id: 'ed1', title: '電車', userId: 'user1', amount: 500,
        date: new Date('2026-01-20'), memo: '定期',
        categoryId: 'cat2', tags: { connect: [{ id: 'tag2' }] },
      },
    });

    const { GET } = await import('@/app/api/entries/[id]/route');
    const req = new Request('http://localhost/', { method: 'GET' });
    const res = await GET(req, { params: Promise.resolve({ id: 'ed1' }) });
    const json = JSON.parse(await res.text());
    expect(res.status).toBe(200);

    const validator = createValidator('/entries/{id}', 'get');
    assertSchemaConform(validator, 200, json, 'GET /entries/{id}');
  });

  it('DELETE /categories/{id} - 200レスポンスがスキーマ準拠', async () => {
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser());

    await prisma.category.create({ data: { id: 'catdel1', name: '削除用', userId: 'user1' } });

    const { DELETE } = await import('@/app/api/categories/[id]/route');
    const res = await DELETE(new Request('http://localhost/'), {
      params: Promise.resolve({ id: 'catdel1' }),
    });
    const json = JSON.parse(await res.text());
    expect(res.status).toBe(200);

    const validator = createValidator('/categories/{id}', 'delete');
    assertSchemaConform(validator, 200, json, 'DELETE /categories/{id}');
  });
});
