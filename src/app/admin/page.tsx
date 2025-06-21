import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const clerkUser = await currentUser();
  const dbUser = await prisma.user.findUnique({
    where: { clerkUserId: clerkUser?.id },
  });

  if (!dbUser?.isAdmin) {
    return redirect("/");
  }

  const allUsers = await prisma.user.findMany();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">ユーザー管理画面</h1>
      <ul className="space-y-2">
        {allUsers.map((user) => (
          <li key={user.id}>
            <p>{user.name} / {user.email}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
