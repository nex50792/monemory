import { UnauthorizedError } from '@/lib/errors';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

type DateFilter = { gte?: Date; lte?: Date } | undefined;
type NumberFilter = { gte?: number; lte?: number } | undefined;

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();

    const url = new URL(req.url);
    const params = url.searchParams;

    const q = params.get('q') ?? undefined;
    const startDateRaw = params.get('startDate') ?? undefined;
    const endDateRaw = params.get('endDate') ?? undefined;
    const minAmountRaw = params.get('minAmount') ?? undefined;
    const maxAmountRaw = params.get('maxAmount') ?? undefined;
    const categoryId = params.get('categoryId') ?? undefined;
    const tagIdsRaw = params.get('tagIds') ?? undefined;
    const sort = params.get('sort') ?? 'date_desc';

    const where: Prisma.EntryWhereInput = { userId: user.id };

    if (q) {
      where.title = { contains: q, mode: 'insensitive' };
    }

    if (startDateRaw) {
      const s = new Date(startDateRaw);
      if (!isNaN(s.getTime())) {
        const existingDateFilter = (where.date as DateFilter) ?? {};
        where.date = { ...existingDateFilter, gte: s };
      }
    }

    if (endDateRaw) {
      const e = new Date(endDateRaw);
      if (!isNaN(e.getTime())) {
        e.setHours(23, 59, 59, 999);
        const existingDateFilter = (where.date as DateFilter) ?? {};
        where.date = { ...existingDateFilter, lte: e };
      }
    }

    if (minAmountRaw) {
      const min = Number(minAmountRaw);
      if (!Number.isNaN(min)) {
        const existingAmountFilter = (where.amount as NumberFilter) ?? {};
        where.amount = { ...existingAmountFilter, gte: min };
      }
    }

    if (maxAmountRaw) {
      const max = Number(maxAmountRaw);
      if (!Number.isNaN(max)) {
        const existingAmountFilter = (where.amount as NumberFilter) ?? {};
        where.amount = { ...existingAmountFilter, lte: max };
      }
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (tagIdsRaw) {
      const tagIds = tagIdsRaw.split(',').filter(Boolean);
      if (tagIds.length > 0) {
        const tagFilter: Prisma.TagListRelationFilter = { some: { id: { in: tagIds } } };
        where.tags = tagFilter;
      }
    }

    let orderBy: Prisma.Enumerable<Prisma.EntryOrderByWithRelationInput> = { date: 'desc' };
    switch (sort) {
      case 'date_asc':
        orderBy = { date: { sort: 'asc', nulls: 'first' } };
        break;
      case 'date_desc':
        orderBy = { date: { sort: 'desc', nulls: 'last' } };
        break;
      case 'amount_asc':
        orderBy = { amount: { sort: 'asc', nulls: 'first' } };
        break;
      case 'amount_desc':
        orderBy = { amount: { sort: 'desc', nulls: 'last' } };
        break;
      case 'title_asc':
        orderBy = { title: { sort: 'asc', nulls: 'first' } };
        break;
      case 'title_desc':
        orderBy = { title: { sort: 'desc', nulls: 'last' } };
        break;
      default:
        orderBy = { date: { sort: 'desc', nulls: 'last' } };
    }

    const entries = await prisma.entry.findMany({
      where,
      orderBy,
      include: {
        category: true,
        tags: true,
      },
    });

    return NextResponse.json(entries);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Entries API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
