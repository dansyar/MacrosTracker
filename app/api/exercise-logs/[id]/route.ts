import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  let userId: number;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = Number(ctx.params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Bad id" }, { status: 400 });
  }
  await sql`DELETE FROM exercise_logs WHERE id = ${id} AND user_id = ${userId}`;
  return NextResponse.json({ ok: true });
}
