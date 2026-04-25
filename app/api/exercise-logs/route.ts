import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { sql, type ExerciseLogRow } from "@/lib/db";

const CreateBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  exercise_name: z.string().trim().min(1).max(120),
  duration_mins: z.number().int().min(0).max(1440),
  calories_burned: z.number().min(0).max(20000),
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

  let rows: ExerciseLogRow[];
  if (start && end) {
    ({ rows } = await sql<ExerciseLogRow>`
      SELECT * FROM exercise_logs
      WHERE user_id = ${userId} AND date BETWEEN ${start} AND ${end}
      ORDER BY date ASC, created_at ASC
    `);
  } else if (date) {
    ({ rows } = await sql<ExerciseLogRow>`
      SELECT * FROM exercise_logs
      WHERE user_id = ${userId} AND date = ${date}
      ORDER BY created_at ASC
    `);
  } else {
    ({ rows } = await sql<ExerciseLogRow>`
      SELECT * FROM exercise_logs
      WHERE user_id = ${userId}
      ORDER BY date DESC, created_at DESC
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
    body = CreateBody.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { rows } = await sql<ExerciseLogRow>`
    INSERT INTO exercise_logs (user_id, date, exercise_name, duration_mins, calories_burned)
    VALUES (${userId}, ${body.date}, ${body.exercise_name}, ${body.duration_mins}, ${body.calories_burned})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
