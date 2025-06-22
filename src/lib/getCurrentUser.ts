import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function getCurrentUser() {
  const authRes = await auth();

  if (!authRes.userId) {
    throw new Error('ログインユーザーが存在しません');
  }

  const user = await prisma.user.findUnique({
    where: {
      clerkUserId: authRes.userId,
    },
  });

  if (!user) {
    throw new Error('該当するユーザーが見つかりません');
  }

  return user;
}
