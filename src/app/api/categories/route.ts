import { getCurrentUser } from '@/lib/getCurrentUser';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const user = await getCurrentUser();
  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' },
  });
  return Response.json(categories);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const { name } = await req.json();

  const category = await prisma.category.upsert({
    where: { name_userId: { name, userId: user.id } },
    update: {},
    create: { name, userId: user.id },
  });

  return Response.json(category);
}
