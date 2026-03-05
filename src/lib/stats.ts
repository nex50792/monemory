import type { Category, Entry } from '@prisma/client';

export interface MonthlyStats {
  month: string;
  total: number;
}

export interface CategoryStats {
  categoryId: string | null;
  categoryName: string;
  total: number;
  count: number;
}

export function calculateMonthlyStats(
  entries: (Entry & { category?: Category | null })[]
): MonthlyStats[] {
  const monthlyMap = new Map<string, number>();

  entries.forEach((entry) => {
    if (!entry.date || !entry.amount) return;

    const date = new Date(entry.date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const monthStr = `${year}-${month}`;

    const currentTotal = monthlyMap.get(monthStr) || 0;
    monthlyMap.set(monthStr, currentTotal + Number(entry.amount));
  });

  return Array.from(monthlyMap.entries())
    .map(([month, total]) => ({
      month,
      total: parseFloat(total.toFixed(2)),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function calculateCategoryStats(
  entries: (Entry & { category?: Category | null })[]
): CategoryStats[] {
  const categoryMap = new Map<string, { name: string; total: number; count: number }>();

  entries.forEach((entry) => {
    if (!entry.amount) return;

    const categoryId = entry.categoryId || 'uncategorized';
    const categoryName = entry.category?.name || '未分類';

    const current = categoryMap.get(categoryId) || { name: categoryName, total: 0, count: 0 };
    categoryMap.set(categoryId, {
      name: categoryName,
      total: current.total + Number(entry.amount),
      count: current.count + 1,
    });
  });

  return Array.from(categoryMap.entries())
    .map(([categoryId, data]) => ({
      categoryId: categoryId === 'uncategorized' ? null : categoryId,
      categoryName: data.name,
      total: parseFloat(data.total.toFixed(2)),
      count: data.count,
    }))
    .sort((a, b) => b.total - a.total);
}

export function getDefaultDateRange(): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 12);
  startDate.setDate(1);

  return { startDate, endDate };
}
