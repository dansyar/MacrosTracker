import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { sql, type UserRow } from "@/lib/db";
import { getAnthropic, CLAUDE_MODEL, extractJSON } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({ description: z.string().trim().min(3).max(500) });

const ExerciseResult = z.object({
  exercise_name: z.string(),
  duration_mins: z.number(),
  calories_burned: z.number(),
  confidence_note: z.string(),
});

const SYSTEM_PROMPT = `You estimate calorie burn for an exercise session described in a short text.
Use the user's body weight when provided to refine the estimate.
Respond ONLY with JSON of this shape:
{
  "exercise_name": string,    // short canonical name e.g. "Running", "Cycling"
  "duration_mins": number,    // integer
  "calories_burned": number,  // integer kcal
  "confidence_note": string   // one short sentence
}
No prose outside the JSON.`;

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

  const { rows } = await sql<UserRow>`SELECT weight_kg FROM users WHERE id = ${userId}`;
  const weightKg = rows[0]?.weight_kg ? Number(rows[0].weight_kg) : null;

  let claudeText: string;
  try {
    const anthropic = getAnthropic();
    const msg = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `User weight: ${weightKg ? `${weightKg} kg` : "unknown"}.\nDescription: ${body.description}`,
            },
          ],
        },
      ],
    });
    claudeText = msg.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("\n");
  } catch (err) {
    console.error("Claude exercise error", err);
    return NextResponse.json({ error: "AI estimation failed" }, { status: 502 });
  }

  try {
    const parsed = ExerciseResult.parse(extractJSON(claudeText));
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Failed to parse Claude exercise response", err, claudeText);
    return NextResponse.json({ error: "Could not parse AI response" }, { status: 502 });
  }
}
