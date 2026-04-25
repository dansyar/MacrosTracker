import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { sql } from "@/lib/db";

// Aggregated day summary in a single round-trip.
export async function GET(req: Request) {
  let userId: number;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const food = await sql<{
    calories: string;
    protein_g: string;
    carbs_g: string;
    fat_g: string;
  }>`
    SELECT
      COALESCE(SUM(calories), 0)::text  AS calories,
      COALESCE(SUM(protein_g), 0)::text AS protein_g,
      COALESCE(SUM(carbs_g), 0)::text   AS carbs_g,
      COALESCE(SUM(fat_g), 0)::text     AS fat_g
    FROM food_logs WHERE user_id = ${userId} AND date = ${date}
  `;

  const exercise = await sql<{ calories_burned: string }>`
    SELECT COALESCE(SUM(calories_burned), 0)::text AS calories_burned
    FROM exercise_logs WHERE user_id = ${userId} AND date = ${date}
  `;

  const water = await sql<{ cups: number }>`
    SELECT cups FROM water_logs WHERE user_id = ${userId} AND date = ${date} LIMIT 1
  `;

  const weight = await sql<{ weight_kg: string; date: string }>`
    SELECT weight_kg::text, date::text FROM weight_logs
    WHERE user_id = ${userId} AND date <= ${date}
    ORDER BY date DESC LIMIT 2
  `;

  // Streak: count consecutive prior days (including this one) with at least one food log.
  const streakRows = await sql<{ date: string }>`
    SELECT DISTINCT date::text FROM food_logs
    WHERE user_id = ${userId} AND date <= ${date}
    ORDER BY date DESC LIMIT 365
  `;
  let streak = 0;
  let cursor = new Date(date + "T00:00:00");
  for (const row of streakRows.rows) {
    const d = new Date(row.date + "T00:00:00");
    const sameDay = d.getTime() === cursor.getTime();
    if (sameDay) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (d.getTime() < cursor.getTime()) {
      break;
    }
  }

  return NextResponse.json({
    date,
    food: {
      calories: Number(food.rows[0].calories),
      protein_g: Number(food.rows[0].protein_g),
      carbs_g: Number(food.rows[0].carbs_g),
      fat_g: Number(food.rows[0].fat_g),
    },
    calories_burned: Number(exercise.rows[0].calories_burned),
    water_cups: water.rows[0]?.cups ?? 0,
    weight: weight.rows[0]
      ? {
          current_kg: Number(weight.rows[0].weight_kg),
          previous_kg: weight.rows[1] ? Number(weight.rows[1].weight_kg) : null,
        }
      : null,
    streak,
  });
}
