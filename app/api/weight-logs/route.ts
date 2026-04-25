import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { sql, type WeightLogRow } from "@/lib/db";

const Body = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight_kg: z.number().min(20).max(500),
});

export async function GET(req: Request) {
  let userId: number;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  let rows: WeightLogRow[];
  if (start && end) {
    ({ rows } = await sql<WeightLogRow>`
      SELECT * FROM weight_logs
      WHERE user_id = ${userId} AND date BETWEEN ${start} AND ${end}
      ORDER BY date ASC
    `);
  } else {
    ({ rows } = await sql<WeightLogRow>`
      SELECT * FROM weight_logs
      WHERE user_id = ${userId}
      ORDER BY date DESC
      LIMIT 200
    `);
  }
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  let userId: number;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { rows } = await sql<WeightLogRow>`
    INSERT INTO weight_logs (user_id, date, weight_kg)
    VALUES (${userId}, ${body.date}, ${body.weight_kg})
    ON CONFLICT (user_id, date) DO UPDATE SET weight_kg = EXCLUDED.weight_kg
    RETURNING *
  `;
  // Mirror to user current weight
  await sql`UPDATE users SET weight_kg = ${body.weight_kg}, updated_at = NOW() WHERE id = ${userId}`;
  return NextResponse.json(rows[0]);
}
