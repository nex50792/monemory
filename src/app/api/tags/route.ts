import { getCurrentUser } from '@/lib/getCurrentUser';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const user = await getCurrentUser();
  const tags = await prisma.tag.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' },
  });
  return Response.json(tags);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const { name } = await req.json();

  const tag = await prisma.tag.upsert({
    where: { name_userId: { name, userId: user.id } },
    update: {},
    create: { name, userId: user.id },
  });

  return Response.json(tag);
}
