import { UnauthorizedError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function getCurrentUser() {
  const authRes = await auth();

  if (!authRes.userId) {
    throw new UnauthorizedError();
  }

  const user = await prisma.user.findUnique({
    where: {
      clerkUserId: authRes.userId,
    },
  });

  if (!user) {
    throw new UnauthorizedError();
  }

  return user;
}
