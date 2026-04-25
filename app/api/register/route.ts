import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sql } from "@/lib/db";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().trim().min(1).max(120).optional(),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const email = parsed.email.toLowerCase().trim();
  const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(parsed.password, 10);
  const { rows } = await sql<{ id: number }>`
    INSERT INTO users (email, password_hash, name)
    VALUES (${email}, ${password_hash}, ${parsed.name ?? null})
    RETURNING id
  `;
  return NextResponse.json({ id: rows[0].id }, { status: 201 });
}
