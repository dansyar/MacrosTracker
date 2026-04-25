import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { getAnthropic, CLAUDE_MODEL, extractJSON } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 30;

const FoodResult = z.object({
  food_name: z.string(),
  portion_estimate: z.string(),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  confidence_note: z.string(),
});

const SYSTEM_PROMPT = `You are a nutrition analyst. Given a photo of food, identify the dish and estimate macros for the visible portion.
Respond ONLY with a single JSON object using this exact shape:
{
  "food_name": string,
  "portion_estimate": string,
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "confidence_note": string
}
Numbers must be plain numbers (no units, no strings). Round to whole numbers.
"portion_estimate" should be a short human-friendly portion description (e.g. "1 medium bowl, ~350g").
"confidence_note" should be one short sentence about how confident you are and any caveats.
Do not include any text outside the JSON.`;

export async function POST(req: Request) {
  try {
    await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing photo" }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Photo too large (max 8MB)" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString("base64");
  const mediaTypeRaw = file.type || "image/jpeg";
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
  type AllowedType = (typeof allowed)[number];
  const mediaType: AllowedType = (allowed as readonly string[]).includes(mediaTypeRaw)
    ? (mediaTypeRaw as AllowedType)
    : "image/jpeg";

  let claudeText: string;
  try {
    const anthropic = getAnthropic();
    const msg = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: "Analyse this food photo and return the JSON.",
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
    console.error("Claude vision error", err);
    return NextResponse.json({ error: "AI analysis failed" }, { status: 502 });
  }

  try {
    const parsed = FoodResult.parse(extractJSON(claudeText));
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Failed to parse Claude response", err, claudeText);
    return NextResponse.json(
      { error: "Could not parse AI response", raw: claudeText },
      { status: 502 },
    );
  }
}
