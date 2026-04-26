import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";

type USDAFood = {
  fdcId: number;
  description: string;
  brandName?: string;
  brandOwner?: string;
  dataType?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: Array<{
    nutrientId?: number;
    nutrientName?: string;
    value?: number;
    unitName?: string;
  }>;
};

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  // DEMO_KEY works (limited) but anyone deploying should set USDA_API_KEY
  const apiKey = process.env.USDA_API_KEY || "DEMO_KEY";
  const usdaUrl = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  usdaUrl.searchParams.set("query", q);
  usdaUrl.searchParams.set("pageSize", "15");
  usdaUrl.searchParams.set("dataType", "Foundation,SR Legacy,Branded");
  usdaUrl.searchParams.set("api_key", apiKey);

  let res: Response;
  try {
    res = await fetch(usdaUrl.toString(), { next: { revalidate: 3600 } });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 502 });
  }
  if (!res.ok) {
    return NextResponse.json({ error: `USDA returned ${res.status}` }, { status: 502 });
  }

  const data = await res.json();
  const foods: USDAFood[] = data.foods ?? [];

  function nutrient(food: USDAFood, names: string[]): number {
    for (const n of food.foodNutrients) {
      const nm = n.nutrientName?.toLowerCase() ?? "";
      if (names.some((x) => nm.includes(x.toLowerCase()))) {
        return Math.max(0, Number(n.value) || 0);
      }
    }
    return 0;
  }

  const items = foods
    .map((f) => ({
      id: f.fdcId,
      name: f.description,
      brand: f.brandName || f.brandOwner || null,
      per_100g: {
        calories: round1(nutrient(f, ["Energy"])),
        protein_g: round1(nutrient(f, ["Protein"])),
        carbs_g: round1(nutrient(f, ["Carbohydrate, by difference", "Carbohydrate"])),
        fat_g: round1(nutrient(f, ["Total lipid (fat)", "Total lipid"])),
      },
      serving_size: f.servingSize ?? null,
      serving_unit: f.servingSizeUnit ?? null,
    }))
    .filter((f) => f.per_100g.calories > 0);

  return NextResponse.json({ items });
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
