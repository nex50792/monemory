import { getCurrentUser } from '@/lib/getCurrentUser';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

type DateFilter = { gte?: Date; lte?: Date } | undefined;
type NumberFilter = { gte?: number; lte?: number } | undefined;

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const params = url.searchParams;

  const q = params.get('q') ?? undefined;
  const startDateRaw = params.get('startDate') ?? undefined;
  const endDateRaw = params.get('endDate') ?? undefined;
  const minAmountRaw = params.get('minAmount') ?? undefined;
  const maxAmountRaw = params.get('maxAmount') ?? undefined;

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

  const entries = await prisma.entry.findMany({
    where,
    orderBy: { date: 'desc' },
    include: {
      category: true,
      tags: true,
    },
  });

  return NextResponse.json(entries);
}
