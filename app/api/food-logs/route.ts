import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { sql, type FoodLogRow } from "@/lib/db";

const CreateBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meal_category: z.enum(["breakfast", "lunch", "dinner", "snacks"]),
  food_name: z.string().trim().min(1).max(200),
  portion: z.string().trim().max(120).optional().nullable(),
  calories: z.number().min(0).max(10000),
  protein_g: z.number().min(0).max(1000),
  carbs_g: z.number().min(0).max(1000),
  fat_g: z.number().min(0).max(1000),
  photo_url: z.string().url().optional().nullable(),
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

  let rows: FoodLogRow[];
  if (start && end) {
    ({ rows } = await sql<FoodLogRow>`
      SELECT * FROM food_logs
      WHERE user_id = ${userId} AND date BETWEEN ${start} AND ${end}
      ORDER BY date ASC, created_at ASC
    `);
  } else if (date) {
    ({ rows } = await sql<FoodLogRow>`
      SELECT * FROM food_logs
      WHERE user_id = ${userId} AND date = ${date}
      ORDER BY created_at ASC
    `);
  } else {
    ({ rows } = await sql<FoodLogRow>`
      SELECT * FROM food_logs
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

  const { rows } = await sql<FoodLogRow>`
    INSERT INTO food_logs
      (user_id, date, meal_category, food_name, portion, calories, protein_g, carbs_g, fat_g, photo_url)
    VALUES
      (${userId}, ${body.date}, ${body.meal_category}, ${body.food_name},
       ${body.portion ?? null}, ${body.calories}, ${body.protein_g},
       ${body.carbs_g}, ${body.fat_g}, ${body.photo_url ?? null})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
