import { generateEmbedding } from '@/lib/gemini';
import { prisma } from '@/lib/prisma';

export type EntryForEmbedding = {
  title: string | null;
  memo: string | null;
  category: { name: string } | null;
  tags: Array<{ name: string }>;
};

export function buildEmbeddingText(entry: EntryForEmbedding): string {
  const parts: string[] = [];
  if (entry.title) parts.push(entry.title);
  if (entry.memo) parts.push(entry.memo);
  if (entry.category?.name) parts.push(entry.category.name);
  for (const t of entry.tags) {
    if (t?.name) parts.push(t.name);
  }
  return parts.join('\n');
}

export async function syncEntryEmbedding(entryId: string): Promise<void> {
  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
    include: { category: true, tags: true },
  });
  if (!entry) return;

  const text = buildEmbeddingText(entry);
  if (!text.trim()) return;

  try {
    const embedding = await generateEmbedding(text);
    const vectorLiteral = `[${embedding.join(',')}]`;
    await prisma.$executeRaw`
      UPDATE "Entry"
      SET embedding = ${vectorLiteral}::vector
      WHERE id = ${entryId}
    `;
  } catch (err) {
    console.error('syncEntryEmbedding failed:', err);
  }
}
