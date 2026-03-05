import { UnauthorizedError } from '@/lib/errors';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { prisma } from '@/lib/prisma';
import {
  calculateCategoryStats,
  calculateMonthlyStats,
  getDefaultDateRange,
} from '@/lib/stats';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();

    const url = new URL(req.url);
    const params = url.searchParams;

    const type = params.get('type') ?? 'monthly';
    const startDateRaw = params.get('startDate');
    const endDateRaw = params.get('endDate');

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateRaw) {
      const parsed = new Date(startDateRaw);
      if (!isNaN(parsed.getTime())) {
        startDate = parsed;
      }
    }

    if (endDateRaw) {
      const parsed = new Date(endDateRaw);
      if (!isNaN(parsed.getTime())) {
        endDate = parsed;
      }
    }

    if (!startDate || !endDate) {
      const defaultRange = getDefaultDateRange();
      startDate = startDate ?? defaultRange.startDate;
      endDate = endDate ?? defaultRange.endDate;
    }

    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const entries = await prisma.entry.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startDate,
          lte: endOfDay,
        },
      },
      include: {
        category: true,
      },
    });

    if (type === 'category') {
      const stats = calculateCategoryStats(entries);
      return NextResponse.json({ byCategory: stats });
    }

    const stats = calculateMonthlyStats(entries);
    return NextResponse.json({ monthly: stats });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
