import { generateEmbedding } from '@/lib/gemini';
import { prisma } from '@/lib/prisma';

export async function buildContextSummary(userId: string): Promise<string> {
  const [entryCount, categories, latest, earliest] = await Promise.all([
    prisma.entry.count({ where: { userId } }),
    prisma.category.findMany({
      where: { userId },
      select: { name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.entry.findFirst({
      where: { userId, date: { not: null } },
      orderBy: { date: 'desc' },
      select: { date: true },
    }),
    prisma.entry.findFirst({
      where: { userId, date: { not: null } },
      orderBy: { date: 'asc' },
      select: { date: true },
    }),
  ]);

  const catNames = categories.map((c) => c.name).join(', ') || 'なし';
  const latestStr = latest?.date?.toISOString().slice(0, 10) ?? '不明';
  const earliestStr = earliest?.date?.toISOString().slice(0, 10) ?? '不明';
  const today = new Date().toISOString().slice(0, 10);

  return [
    '# ユーザーの家計データ概要',
    `- 総記録件数: ${entryCount}件`,
    `- カテゴリ数: ${categories.length}件 (${catNames})`,
    `- 記録期間: ${earliestStr} 〜 ${latestStr}`,
    `- 現在の日付: ${today}`,
  ].join('\n');
}

export function buildRagSystemPrompt(summary: string): string {
  return [
    summary,
    '',
    'あなたは家計簿AIアシスタントです。ユーザーの家計データに関する質問に日本語で答えてください。',
    '',
    '回答方針:',
    '- 上記の概要から即答できる質問(カテゴリ数、記録期間、総件数等)は tool を使わずに答える。',
    '- 具体的な記録内容や過去の詳細が必要な質問は search_entries を使う。',
    '- 集計(合計・平均・件数・カテゴリ別内訳・期間別内訳等)が必要な質問は get_expense_stats を使う。',
    '- tool の結果に含まれない情報は「該当する記録がありません」と正直に返す。推測・創作は禁止。',
    '- 家計データ以外の質問には「家計簿の質問にのみお答えできます」と返す。',
  ].join('\n');
}

export type RetrievedEntry = {
  id: string;
  title: string | null;
  amount: number | null;
  memo: string | null;
  date: Date | null;
  categoryName: string | null;
};

export async function searchRelevantEntries(
  userId: string,
  query: string,
  limit: number,
): Promise<RetrievedEntry[]> {
  const embedding = await generateEmbedding(query);
  const literal = `[${embedding.join(',')}]`;

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string | null;
      amount: string | null;
      memo: string | null;
      date: Date | null;
      category_name: string | null;
    }>
  >`
    SELECT
      e."id",
      e."title",
      e."amount"::text AS "amount",
      e."memo",
      e."date",
      c."name" AS "category_name"
    FROM "Entry" e
    LEFT JOIN "Category" c ON e."categoryId" = c."id"
    WHERE e."userId" = ${userId}
      AND e."embedding" IS NOT NULL
    ORDER BY e."embedding" <=> ${literal}::vector
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    amount: r.amount ? Number(r.amount) : null,
    memo: r.memo,
    date: r.date,
    categoryName: r.category_name,
  }));
}
