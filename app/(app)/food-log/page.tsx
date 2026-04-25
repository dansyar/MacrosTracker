"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { DateNav } from "@/components/DateNav";
import { todayISO } from "@/lib/dates";

type FoodLog = {
  id: number;
  date: string;
  meal_category: "breakfast" | "lunch" | "dinner" | "snacks";
  food_name: string;
  portion: string | null;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
};

const MEAL_ORDER: FoodLog["meal_category"][] = ["breakfast", "lunch", "dinner", "snacks"];
const MEAL_LABELS: Record<FoodLog["meal_category"], string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

function FoodLogInner() {
  const search = useSearchParams();
  const [date, setDate] = useState(() => search.get("date") || todayISO());
  const [items, setItems] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/food-logs?date=${date}`);
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function remove(id: number) {
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`/api/food-logs/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete");
      return;
    }
    toast.success("Deleted");
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const grouped = MEAL_ORDER.map((m) => ({
    category: m,
    entries: items.filter((i) => i.meal_category === m),
  }));

  return (
    <main className="px-4 pt-6 pb-6 space-y-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Food log</h1>
        <Link href="/log-food" className="btn-primary !py-2 !px-3 text-sm">+ Add</Link>
      </header>
      <div className="card">
        <DateNav date={date} onChange={setDate} />
      </div>

      {grouped.map(({ category, entries }) => {
        const totals = entries.reduce(
          (acc, e) => ({
            calories: acc.calories + Number(e.calories),
            protein_g: acc.protein_g + Number(e.protein_g),
            carbs_g: acc.carbs_g + Number(e.carbs_g),
            fat_g: acc.fat_g + Number(e.fat_g),
          }),
          { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
        );
        return (
          <section key={category} className="card">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="font-semibold">{MEAL_LABELS[category]}</h2>
              <div className="text-sm text-fg-muted tabular-nums">
                {Math.round(totals.calories)} kcal
              </div>
            </div>
            {entries.length === 0 ? (
              <div className="text-sm text-fg-dim py-2">
                <Link href={`/log-food?meal=${category}&date=${date}`} className="text-accent hover:underline">
                  + Add to {MEAL_LABELS[category].toLowerCase()}
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {entries.map((e) => (
                  <li key={e.id} className="py-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{e.food_name}</div>
                      {e.portion && (
                        <div className="text-xs text-fg-muted truncate">{e.portion}</div>
                      )}
                      <div className="text-xs text-fg-dim mt-0.5 tabular-nums">
                        P {Math.round(Number(e.protein_g))}g · C {Math.round(Number(e.carbs_g))}g · F {Math.round(Number(e.fat_g))}g
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold tabular-nums">{Math.round(Number(e.calories))}</div>
                      <button
                        onClick={() => remove(e.id)}
                        className="text-xs text-danger hover:underline mt-1"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
                <li className="pt-2 text-xs text-fg-muted tabular-nums flex justify-between">
                  <span>Subtotal</span>
                  <span>
                    {Math.round(totals.calories)} kcal · P {Math.round(totals.protein_g)} · C {Math.round(totals.carbs_g)} · F {Math.round(totals.fat_g)}
                  </span>
                </li>
              </ul>
            )}
          </section>
        );
      })}

      {loading && <div className="text-center text-fg-dim text-sm">Loading...</div>}
    </main>
  );
}

export default function FoodLogPage() {
  return (
    <Suspense fallback={<div className="px-4 pt-6 text-fg-dim">Loading...</div>}>
      <FoodLogInner />
    </Suspense>
  );
}
