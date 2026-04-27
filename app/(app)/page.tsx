"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { DateNav } from "@/components/DateNav";
import { ProgressRing } from "@/components/ProgressRing";
import { MacroBar } from "@/components/MacroBar";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Skeleton } from "@/components/Skeleton";
import { todayISO } from "@/lib/dates";

type Profile = {
  name: string | null;
  tdee: number | null;
  protein_target_g: number | null;
  carbs_target_g: number | null;
  fat_target_g: number | null;
  weight_kg: number | null;
};

type Summary = {
  date: string;
  food: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  calories_burned: number;
  water_cups: number;
  weight: { current_kg: number; previous_kg: number | null } | null;
  streak: number;
};

export default function DashboardPage() {
  const [date, setDate] = useState<string>(() => todayISO());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [weightInput, setWeightInput] = useState<string>("");

  const reload = useCallback(
    async (which: "all" | "summary" = "all") => {
      setLoading(true);
      const reqs: Promise<Response>[] = [fetch(`/api/summary?date=${date}`)];
      if (which === "all") reqs.push(fetch("/api/profile"));
      const [sumRes, profRes] = await Promise.all(reqs);
      const sum = await sumRes.json();
      setSummary(sum);
      if (which === "all" && profRes) {
        setProfile(await profRes.json());
      }
      setLoading(false);
    },
    [date],
  );

  const initialLoad = profile === null && summary === null && loading;

  useEffect(() => {
    reload("all");
  }, [reload]);

  async function setWater(cups: number) {
    const next = Math.max(0, cups);
    setSummary((s) => (s ? { ...s, water_cups: next } : s));
    await fetch("/api/water-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, cups: next }),
    });
  }

  async function logWeight() {
    const w = Number(weightInput);
    if (!Number.isFinite(w) || w < 20 || w > 500) {
      toast.error("Enter a valid weight (kg)");
      return;
    }
    const res = await fetch("/api/weight-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, weight_kg: w }),
    });
    if (!res.ok) {
      toast.error("Could not save weight");
      return;
    }
    toast.success("Weight logged");
    setWeightInput("");
    reload("all");
  }

  const calorieTarget = profile?.tdee ?? 0;
  const consumed = summary?.food.calories ?? 0;
  const burned = summary?.calories_burned ?? 0;
  const remaining = Math.max(0, calorieTarget + burned - consumed);

  if (initialLoad) {
    return (
      <main className="px-4 pt-6 pb-6 space-y-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      </main>
    );
  }

  return (
    <PullToRefresh onRefresh={() => reload("all")}>
    <main className="px-4 pt-6 pb-6 space-y-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">
          Hi{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}
        </h1>
        {summary && summary.streak > 0 && (
          <div className="text-sm text-fg-muted flex items-center gap-1">
            <span>🔥</span>
            <span className="tabular-nums">{summary.streak}-day streak</span>
          </div>
        )}
      </header>

      <div className="sticky top-0 z-20 -mx-4 px-4 pt-2 pb-2 bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
        <div className="card !p-2">
          <DateNav date={date} onChange={setDate} />
        </div>
      </div>

      <section className="card flex flex-col items-center">
        <ProgressRing
          value={consumed}
          target={Math.max(1, calorieTarget + burned)}
          label={
            <div>
              <div className="text-3xl font-bold tabular-nums">
                {Math.round(remaining)}
              </div>
              <div className="text-xs text-fg-muted uppercase tracking-wide">remaining</div>
            </div>
          }
        />
        <div className="grid grid-cols-3 w-full mt-4 text-center text-sm">
          <Stat label="Goal" value={calorieTarget} />
          <Stat label="Food" value={Math.round(consumed)} />
          <Stat label="Exercise" value={`-${Math.round(burned)}`} />
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-sm font-semibold text-fg-muted uppercase tracking-wide">Macros</h2>
        <MacroBar
          label="Protein"
          value={summary?.food.protein_g ?? 0}
          target={profile?.protein_target_g ?? 0}
          color="#22c55e"
        />
        <MacroBar
          label="Carbs"
          value={summary?.food.carbs_g ?? 0}
          target={profile?.carbs_target_g ?? 0}
          color="#3b82f6"
        />
        <MacroBar
          label="Fat"
          value={summary?.food.fat_g ?? 0}
          target={profile?.fat_target_g ?? 0}
          color="#f59e0b"
        />
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="card">
          <h2 className="text-sm font-semibold text-fg-muted uppercase tracking-wide mb-3">Water</h2>
          <div className="flex items-center justify-between">
            <button
              className="btn-secondary !px-3 !py-2"
              onClick={() => setWater((summary?.water_cups ?? 0) - 1)}
              aria-label="Remove cup"
            >
              −
            </button>
            <div className="text-center">
              <div className="text-2xl font-bold tabular-nums">{summary?.water_cups ?? 0}</div>
              <div className="text-xs text-fg-muted">cups</div>
            </div>
            <button
              className="btn-primary !px-3 !py-2"
              onClick={() => setWater((summary?.water_cups ?? 0) + 1)}
              aria-label="Add cup"
            >
              +
            </button>
          </div>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-fg-muted uppercase tracking-wide mb-3">Weight</h2>
          {summary?.weight ? (
            <div className="text-2xl font-bold tabular-nums mb-1">
              {summary.weight.current_kg.toFixed(1)} kg
            </div>
          ) : (
            <div className="text-fg-muted text-sm mb-1">No log yet</div>
          )}
          {summary?.weight?.previous_kg != null && (
            <div className="text-xs text-fg-muted mb-2">
              {(() => {
                const diff = summary.weight!.current_kg - summary.weight!.previous_kg!;
                const sign = diff > 0 ? "+" : "";
                const color = diff > 0 ? "text-warn" : diff < 0 ? "text-accent" : "text-fg-muted";
                return <span className={color}>{sign}{diff.toFixed(1)} kg vs last</span>;
              })()}
            </div>
          )}
          <div className="flex gap-2">
            <input
              className="input !py-1.5 !px-2 text-sm"
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="kg"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
            />
            <button className="btn-secondary !px-3 !py-1.5 text-sm" onClick={logWeight}>
              Log
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/log-food" className="card text-center hover:border-accent transition">
          <div className="text-accent text-2xl mb-1">+</div>
          <div className="font-semibold">Log food</div>
          <div className="text-xs text-fg-muted">Photo or manual</div>
        </Link>
        <Link href="/log-exercise" className="card text-center hover:border-accent transition">
          <div className="text-accent text-2xl mb-1">⚡</div>
          <div className="font-semibold">Log exercise</div>
          <div className="text-xs text-fg-muted">AI-estimate burn</div>
        </Link>
      </div>

      <Link href={`/food-log?date=${date}`} className="block card hover:border-accent transition">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">Today's meals</div>
            <div className="text-sm text-fg-muted">View all entries grouped by meal</div>
          </div>
          <span className="text-fg-muted">›</span>
        </div>
      </Link>

    </main>
    </PullToRefresh>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-base font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-fg-muted">{label}</div>
    </div>
  );
}
