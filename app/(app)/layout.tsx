import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql, type UserRow } from "@/lib/db";
import { BottomNav } from "@/components/BottomNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const { rows } = await sql<UserRow>`SELECT * FROM users WHERE id = ${Number(userId)}`;
  const user = rows[0];
  if (!user) redirect("/login");
  if (!user.tdee || !user.weight_kg) redirect("/onboarding");

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto">
      {children}
      <BottomNav />
    </div>
  );
}
