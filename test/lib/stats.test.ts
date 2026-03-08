import type { Category, Entry } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { describe, expect, it } from 'vitest';
import {
  calculateCategoryStats,
  calculateMonthlyStats,
  getDefaultDateRange,
} from '@/lib/stats';

const makeEntry = (overrides: Partial<Entry> & { category?: Category | null } = {}): Entry & { category?: Category | null } => ({
  id: 'e1',
  userId: 'u1',
  title: 'Test',
  amount: new Decimal(1000),
  date: new Date('2026-01-15'),
  memo: null,
  categoryId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('calculateMonthlyStats', () => {
  it('groups entries by month and sums totals', () => {
    const entries = [
      makeEntry({ id: 'e1', amount: new Decimal(1000), date: new Date('2026-01-10') }),
      makeEntry({ id: 'e2', amount: new Decimal(2000), date: new Date('2026-01-20') }),
      makeEntry({ id: 'e3', amount: new Decimal(500), date: new Date('2026-02-05') }),
    ];
    const result = calculateMonthlyStats(entries);
    expect(result).toEqual([
      { month: '2026-01', total: 3000 },
      { month: '2026-02', total: 500 },
    ]);
  });

  it('returns sorted by month ascending', () => {
    const entries = [
      makeEntry({ id: 'e1', amount: new Decimal(100), date: new Date('2026-03-01') }),
      makeEntry({ id: 'e2', amount: new Decimal(200), date: new Date('2026-01-01') }),
    ];
    const result = calculateMonthlyStats(entries);
    expect(result[0].month).toBe('2026-01');
    expect(result[1].month).toBe('2026-03');
  });

  it('skips entries with null date', () => {
    const entries = [
      makeEntry({ id: 'e1', amount: new Decimal(1000), date: null }),
      makeEntry({ id: 'e2', amount: new Decimal(500), date: new Date('2026-01-01') }),
    ];
    const result = calculateMonthlyStats(entries);
    expect(result).toHaveLength(1);
    expect(result[0].total).toBe(500);
  });

  it('skips entries with null amount', () => {
    const entries = [
      makeEntry({ id: 'e1', amount: null, date: new Date('2026-01-01') }),
      makeEntry({ id: 'e2', amount: new Decimal(300), date: new Date('2026-01-01') }),
    ];
    const result = calculateMonthlyStats(entries);
    expect(result).toHaveLength(1);
    expect(result[0].total).toBe(300);
  });

  it('returns empty array for no entries', () => {
    expect(calculateMonthlyStats([])).toEqual([]);
  });

  it('handles decimal precision', () => {
    const entries = [
      makeEntry({ id: 'e1', amount: new Decimal(10.1), date: new Date('2026-01-01') }),
      makeEntry({ id: 'e2', amount: new Decimal(10.2), date: new Date('2026-01-01') }),
    ];
    const result = calculateMonthlyStats(entries);
    expect(result[0].total).toBe(20.3);
  });
});

describe('calculateCategoryStats', () => {
  it('groups entries by category', () => {
    const cat: Category = { id: 'cat1', name: '食費', userId: 'u1' };
    const entries = [
      makeEntry({ id: 'e1', amount: new Decimal(1000), categoryId: 'cat1', category: cat }),
      makeEntry({ id: 'e2', amount: new Decimal(2000), categoryId: 'cat1', category: cat }),
    ];
    const result = calculateCategoryStats(entries);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      categoryId: 'cat1',
      categoryName: '食費',
      total: 3000,
      count: 2,
    });
  });

  it('treats entries without category as uncategorized', () => {
    const entries = [
      makeEntry({ id: 'e1', amount: new Decimal(500), categoryId: null, category: null }),
    ];
    const result = calculateCategoryStats(entries);
    expect(result[0]).toMatchObject({
      categoryId: null,
      categoryName: '未分類',
      total: 500,
      count: 1,
    });
  });

  it('sorts by total descending', () => {
    const catA: Category = { id: 'catA', name: 'A', userId: 'u1' };
    const catB: Category = { id: 'catB', name: 'B', userId: 'u1' };
    const entries = [
      makeEntry({ id: 'e1', amount: new Decimal(100), categoryId: 'catA', category: catA }),
      makeEntry({ id: 'e2', amount: new Decimal(500), categoryId: 'catB', category: catB }),
    ];
    const result = calculateCategoryStats(entries);
    expect(result[0].categoryName).toBe('B');
    expect(result[1].categoryName).toBe('A');
  });

  it('skips entries with null amount', () => {
    const entries = [
      makeEntry({ id: 'e1', amount: null }),
    ];
    const result = calculateCategoryStats(entries);
    expect(result).toHaveLength(0);
  });
});

describe('getDefaultDateRange', () => {
  it('returns startDate 12 months ago on the 1st', () => {
    const { startDate, endDate } = getDefaultDateRange();
    expect(startDate.getDate()).toBe(1);
    expect(endDate.getTime()).toBeLessThanOrEqual(Date.now());

    const diffMonths =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth());
    expect(diffMonths).toBeGreaterThanOrEqual(12);
  });
});
