import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { sql, type WaterLogRow } from "@/lib/db";

const Body = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cups: z.number().int().min(0).max(50),
});

export async function GET(req: Request) {
  let userId: number;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  let rows: WaterLogRow[];
  if (start && end) {
    ({ rows } = await sql<WaterLogRow>`
      SELECT * FROM water_logs
      WHERE user_id = ${userId} AND date BETWEEN ${start} AND ${end}
      ORDER BY date ASC
    `);
  } else if (date) {
    ({ rows } = await sql<WaterLogRow>`
      SELECT * FROM water_logs WHERE user_id = ${userId} AND date = ${date} LIMIT 1
    `);
  } else {
    ({ rows } = await sql<WaterLogRow>`
      SELECT * FROM water_logs WHERE user_id = ${userId}
      ORDER BY date DESC LIMIT 60
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
  const { rows } = await sql<WaterLogRow>`
    INSERT INTO water_logs (user_id, date, cups, updated_at)
    VALUES (${userId}, ${body.date}, ${body.cups}, NOW())
    ON CONFLICT (user_id, date) DO UPDATE
      SET cups = EXCLUDED.cups, updated_at = NOW()
    RETURNING *
  `;
  return NextResponse.json(rows[0]);
}
