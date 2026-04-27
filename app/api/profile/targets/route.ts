import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { sql, type UserRow } from "@/lib/db";
import { calculateTDEE, calculateMacroTargets } from "@/lib/macros";

const Body = z.object({
  tdee: z.number().int().min(800).max(8000),
  protein_target_g: z.number().int().min(0).max(800),
  carbs_target_g: z.number().int().min(0).max(2000),
  fat_target_g: z.number().int().min(0).max(800),
});

// Override the auto-calculated targets with custom values.
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
  await sql`
    UPDATE users SET
      tdee = ${body.tdee},
      protein_target_g = ${body.protein_target_g},
      carbs_target_g = ${body.carbs_target_g},
      fat_target_g = ${body.fat_target_g},
      updated_at = NOW()
    WHERE id = ${userId}
  `;
  return NextResponse.json({ ok: true });
}

// Reset targets back to the Mifflin-St Jeor + macro split derived from the user's stats.
export async function DELETE() {
  let userId: number;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { rows } = await sql<UserRow>`SELECT * FROM users WHERE id = ${userId}`;
  const u = rows[0];
  if (!u || !u.weight_kg || !u.height_cm || !u.age || !u.gender || !u.activity_level) {
    return NextResponse.json({ error: "Profile incomplete" }, { status: 400 });
  }
  const tdee = calculateTDEE({
    weightKg: Number(u.weight_kg),
    heightCm: Number(u.height_cm),
    age: u.age,
    gender: u.gender,
    activityLevel: u.activity_level,
  });
  const macros = calculateMacroTargets({ weightKg: Number(u.weight_kg), tdee });
  await sql`
    UPDATE users SET
      tdee = ${tdee},
      protein_target_g = ${macros.protein_g},
      carbs_target_g = ${macros.carbs_g},
      fat_target_g = ${macros.fat_g},
      updated_at = NOW()
    WHERE id = ${userId}
  `;
  return NextResponse.json({ tdee, ...macros });
}
