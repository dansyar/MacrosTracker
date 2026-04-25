import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { sql, type UserRow } from "@/lib/db";
import { calculateTDEE, calculateMacroTargets } from "@/lib/macros";

const Body = z.object({
  name: z.string().trim().min(1).max(120),
  age: z.number().int().min(10).max(120),
  weight_kg: z.number().min(20).max(400),
  height_cm: z.number().min(80).max(250),
  gender: z.enum(["male", "female", "other"]),
  activity_level: z.enum(["sedentary", "light", "moderate", "very"]),
});

export async function GET() {
  let userId;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { rows } = await sql<UserRow>`SELECT * FROM users WHERE id = ${userId}`;
  const u = rows[0];
  if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    id: u.id,
    email: u.email,
    name: u.name,
    age: u.age,
    weight_kg: u.weight_kg ? Number(u.weight_kg) : null,
    height_cm: u.height_cm ? Number(u.height_cm) : null,
    gender: u.gender,
    activity_level: u.activity_level,
    tdee: u.tdee,
    protein_target_g: u.protein_target_g,
    carbs_target_g: u.carbs_target_g,
    fat_target_g: u.fat_target_g,
  });
}

export async function POST(req: Request) {
  let userId;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const tdee = calculateTDEE({
    weightKg: parsed.weight_kg,
    heightCm: parsed.height_cm,
    age: parsed.age,
    gender: parsed.gender,
    activityLevel: parsed.activity_level,
  });
  const macros = calculateMacroTargets({ weightKg: parsed.weight_kg, tdee });

  await sql`
    UPDATE users SET
      name = ${parsed.name},
      age = ${parsed.age},
      weight_kg = ${parsed.weight_kg},
      height_cm = ${parsed.height_cm},
      gender = ${parsed.gender},
      activity_level = ${parsed.activity_level},
      tdee = ${tdee},
      protein_target_g = ${macros.protein_g},
      carbs_target_g = ${macros.carbs_g},
      fat_target_g = ${macros.fat_g},
      updated_at = NOW()
    WHERE id = ${userId}
  `;

  // Also seed a weight log for today if the user has none for today
  const today = new Date().toISOString().slice(0, 10);
  await sql`
    INSERT INTO weight_logs (user_id, date, weight_kg)
    VALUES (${userId}, ${today}, ${parsed.weight_kg})
    ON CONFLICT (user_id, date) DO UPDATE SET weight_kg = EXCLUDED.weight_kg
  `;

  return NextResponse.json({ tdee, ...macros });
}
