"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { DateNav } from "@/components/DateNav";
import { SwipeableRow } from "@/components/SwipeableRow";
import { Skeleton } from "@/components/Skeleton";
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
  const [items, setItems] = useState<FoodLog[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/food-logs?date=${date}`);
      const data = await res.json();
      setItems(data.items || []);
    } finally {
      setRefreshing(false);
    }
  }, [date]);

  useEffect(() => {
    setItems(null);
    reload();
  }, [reload]);

  async function remove(id: number) {
    const target = items?.find((i) => i.id === id);
    // Optimistic remove with toast undo. If the API fails we restore.
    setItems((prev) => prev?.filter((i) => i.id !== id) ?? null);
    const res = await fetch(`/api/food-logs/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete");
      if (target) setItems((prev) => (prev ? [...prev, target] : prev));
      return;
    }
    toast.success("Deleted");
  }

  const initialLoad = items === null;
  const safeItems = items ?? [];

  const grouped = MEAL_ORDER.map((m) => ({
    category: m,
    entries: safeItems.filter((i) => i.meal_category === m),
  }));

  return (
    <main className="px-4 pt-6 pb-6 space-y-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Food log</h1>
        <Link href="/log-food" className="btn-primary !py-2 !px-3 text-sm">+ Add</Link>
      </header>
      <div className="sticky top-0 z-20 -mx-4 px-4 pt-2 pb-2 bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
        <div className="card !p-2">
          <DateNav date={date} onChange={setDate} />
        </div>
      </div>

      {initialLoad && (
        <>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </>
      )}

      {!initialLoad && grouped.map(({ category, entries }) => {
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
          <section key={category} className="card !p-0 overflow-hidden">
            <div className="flex items-baseline justify-between p-4 pb-2">
              <h2 className="font-semibold">{MEAL_LABELS[category]}</h2>
              <div className="text-sm text-fg-muted tabular-nums">
                {Math.round(totals.calories)} kcal
              </div>
            </div>
            {entries.length === 0 ? (
              <div className="text-sm text-fg-dim px-4 pb-4">
                <Link href={`/log-food?meal=${category}&date=${date}`} className="text-accent hover:underline">
                  + Add to {MEAL_LABELS[category].toLowerCase()}
                </Link>
              </div>
            ) : (
              <ul>
                {entries.map((e) => (
                  <li key={e.id} className="border-t border-border first:border-t-0">
                    <SwipeableRow onDelete={() => remove(e.id)}>
                      <div className="px-4 py-3 flex items-start justify-between gap-2">
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
                          <div className="text-[10px] text-fg-dim">swipe ←</div>
                        </div>
                      </div>
                    </SwipeableRow>
                  </li>
                ))}
                <li className="border-t border-border px-4 py-2 text-xs text-fg-muted tabular-nums flex justify-between">
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

      {refreshing && !initialLoad && (
        <div className="text-center text-fg-dim text-xs">Updating…</div>
      )}
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
