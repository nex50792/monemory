import { Type } from '@google/genai';
import { searchRelevantEntries } from '@/lib/chatRetrieval';
import { prisma } from '@/lib/prisma';

export const CHAT_TOOL_DECLARATIONS = [
  {
    name: 'search_entries',
    description:
      '意味検索で過去の家計記録を取得します。「先月のランチ」「旅行費用の傾向」など、特定トピックの詳細が必要な場合に使ってください。上限20件。',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: '検索クエリ(自然言語)',
        },
        limit: {
          type: Type.INTEGER,
          description: '取得件数の上限。省略時は5、最大20。',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_expense_stats',
    description:
      '期間・カテゴリ別の集計を取得します。合計金額、件数、カテゴリ別内訳などが必要な場合に使ってください。',
    parameters: {
      type: Type.OBJECT,
      properties: {
        startDate: {
          type: Type.STRING,
          description: '集計開始日 (ISO date, e.g. "2026-06-01")。省略可。',
        },
        endDate: {
          type: Type.STRING,
          description: '集計終了日 (ISO date, e.g. "2026-06-30")。省略可。',
        },
        groupBy: {
          type: Type.STRING,
          description:
            '"category": カテゴリ別内訳 / "month": 月別内訳 / "none": 全体合計。省略時は "none"。',
        },
      },
    },
  },
];

export type SearchEntriesArgs = {
  query: string;
  limit?: number;
};

export type GetExpenseStatsArgs = {
  startDate?: string;
  endDate?: string;
  groupBy?: 'category' | 'month' | 'none';
};

function toDateOrNull(input: string | undefined): Date | null {
  if (!input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildDateFilter(startDate?: string, endDate?: string) {
  const gte = toDateOrNull(startDate);
  const lte = toDateOrNull(endDate);
  if (!gte && !lte) return undefined;
  return {
    ...(gte ? { gte } : {}),
    ...(lte ? { lte } : {}),
  };
}

async function statsGroupByCategory(userId: string, dateFilter?: object) {
  const where = {
    userId,
    ...(dateFilter ? { date: dateFilter } : {}),
  };
  const rows = await prisma.entry.groupBy({
    by: ['categoryId'],
    where,
    _sum: { amount: true },
    _count: true,
  });
  const catIds = rows
    .map((r) => r.categoryId)
    .filter((id): id is string => typeof id === 'string');
  const categories = catIds.length
    ? await prisma.category.findMany({
        where: { id: { in: catIds } },
        select: { id: true, name: true },
      })
    : [];
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  return rows
    .map((r) => ({
      category: r.categoryId ? catMap.get(r.categoryId) ?? '不明' : 'カテゴリなし',
      totalAmount: Number(r._sum.amount ?? 0),
      entryCount: r._count,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

async function statsGroupByMonth(userId: string, dateFilter?: object) {
  const where = {
    userId,
    date: { not: null, ...(dateFilter ?? {}) },
  };
  const rows = await prisma.entry.findMany({
    where,
    select: { date: true, amount: true },
  });
  const buckets = new Map<string, { totalAmount: number; entryCount: number }>();
  for (const r of rows) {
    if (!r.date) continue;
    const key = r.date.toISOString().slice(0, 7);
    const cur = buckets.get(key) ?? { totalAmount: 0, entryCount: 0 };
    cur.totalAmount += Number(r.amount ?? 0);
    cur.entryCount += 1;
    buckets.set(key, cur);
  }
  return Array.from(buckets.entries())
    .map(([month, v]) => ({ month, ...v }))
    .sort((a, b) => (a.month < b.month ? -1 : 1));
}

export type ToolResponse = Record<string, unknown>;

export type ChatToolExecutor = (
  name: string,
  args: Record<string, unknown>,
) => Promise<ToolResponse>;

export function createChatToolExecutor(userId: string): ChatToolExecutor {
  return async (name, args) => {
    if (name === 'search_entries') {
      const { query, limit } = args as SearchEntriesArgs;
      if (!query || typeof query !== 'string' || !query.trim()) {
        return { error: 'query is required' };
      }
      const k = Math.min(Math.max(Number(limit) || 5, 1), 20);
      const entries = await searchRelevantEntries(userId, query, k);
      return {
        entries: entries.map((e) => ({
          id: e.id,
          title: e.title,
          amount: e.amount,
          memo: e.memo,
          date: e.date ? e.date.toISOString().slice(0, 10) : null,
          category: e.categoryName,
        })),
      };
    }

    if (name === 'get_expense_stats') {
      const { startDate, endDate, groupBy } = args as GetExpenseStatsArgs;
      const dateFilter = buildDateFilter(startDate, endDate);
      const where = {
        userId,
        ...(dateFilter ? { date: dateFilter } : {}),
      };

      if (groupBy === 'category') {
        const groups = await statsGroupByCategory(userId, dateFilter);
        return { groupBy: 'category', groups };
      }
      if (groupBy === 'month') {
        const groups = await statsGroupByMonth(userId, dateFilter);
        return { groupBy: 'month', groups };
      }

      const agg = await prisma.entry.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
      });
      return {
        groupBy: 'none',
        totalAmount: Number(agg._sum.amount ?? 0),
        entryCount: agg._count,
        startDate: startDate ?? null,
        endDate: endDate ?? null,
      };
    }

    return { error: `unknown tool: ${name}` };
  };
}
