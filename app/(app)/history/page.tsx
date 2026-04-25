"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { shiftDays, todayISO, fromISO } from "@/lib/dates";

type Range = "week" | "month";

type FoodRow = {
  date: string;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
};

type WeightRow = { date: string; weight_kg: string };

export default function HistoryPage() {
  const [range, setRange] = useState<Range>("week");
  const [calorieTarget, setCalorieTarget] = useState<number>(0);
  const [foodByDate, setFoodByDate] = useState<Map<string, { cal: number; p: number; c: number; f: number }>>(new Map());
  const [weights, setWeights] = useState<WeightRow[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const days = range === "week" ? 7 : 30;
  const end = todayISO();
  const start = shiftDays(end, -(days - 1));

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [profileRes, foodRes, weightRes, summaryRes] = await Promise.all([
        fetch("/api/profile"),
        fetch(`/api/food-logs?start=${start}&end=${end}`),
        fetch(`/api/weight-logs?start=${shiftDays(end, -90)}&end=${end}`),
        fetch(`/api/summary?date=${end}`),
      ]);
      if (cancelled) return;
      const profile = await profileRes.json();
      const food = await foodRes.json();
      const weight = await weightRes.json();
      const summary = await summaryRes.json();

      setCalorieTarget(profile?.tdee ?? 0);
      const map = new Map<string, { cal: number; p: number; c: number; f: number }>();
      for (const r of food.items as FoodRow[]) {
        const key = r.date.slice(0, 10);
        const cur = map.get(key) ?? { cal: 0, p: 0, c: 0, f: 0 };
        cur.cal += Number(r.calories);
        cur.p += Number(r.protein_g);
        cur.c += Number(r.carbs_g);
        cur.f += Number(r.fat_g);
        map.set(key, cur);
      }
      setFoodByDate(map);
      setWeights(weight.items || []);
      setStreak(summary.streak ?? 0);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [start, end]);

  const calorieSeries = useMemo(() => {
    const out: Array<{ date: string; label: string; calories: number }> = [];
    for (let i = 0; i < days; i++) {
      const d = shiftDays(start, i);
      const day = foodByDate.get(d);
      out.push({
        date: d,
        label: shortLabel(d, range),
        calories: day ? Math.round(day.cal) : 0,
      });
    }
    return out;
  }, [days, foodByDate, start, range]);

  const macroAvg = useMemo(() => {
    let p = 0, c = 0, f = 0, n = 0;
    for (const v of foodByDate.values()) {
      p += v.p; c += v.c; f += v.f; n += 1;
    }
    if (n === 0) return [{ name: "Protein", grams: 0 }, { name: "Carbs", grams: 0 }, { name: "Fat", grams: 0 }];
    return [
      { name: "Protein", grams: Math.round(p / n) },
      { name: "Carbs", grams: Math.round(c / n) },
      { name: "Fat", grams: Math.round(f / n) },
    ];
  }, [foodByDate]);

  const weightSeries = useMemo(
    () =>
      weights
        .map((w) => ({
          date: w.date.slice(0, 10),
          label: shortLabel(w.date.slice(0, 10), range),
          weight: Number(w.weight_kg),
        }))
        .filter((w) => w.date >= start && w.date <= end),
    [weights, start, end, range],
  );

  const loggedDays = calorieSeries.filter((d) => d.calories > 0).length;
  const consistency = Math.round((loggedDays / days) * 100);
  const avgCalories = Math.round(
    calorieSeries.reduce((sum, d) => sum + d.calories, 0) / Math.max(1, loggedDays || 1),
  );

  return (
    <main className="px-4 pt-6 pb-6 space-y-4">
      <h1 className="text-2xl font-bold">History</h1>

      <div className="grid grid-cols-2 gap-1 bg-bg-elevated p-1 rounded-xl border border-border">
        <button
          onClick={() => setRange("week")}
          className={`py-2 rounded-lg text-sm font-medium transition ${range === "week" ? "bg-accent text-black" : "text-fg-muted"}`}
        >
          7 days
        </button>
        <button
          onClick={() => setRange("month")}
          className={`py-2 rounded-lg text-sm font-medium transition ${range === "month" ? "bg-accent text-black" : "text-fg-muted"}`}
        >
          30 days
        </button>
      </div>

      <section className="grid grid-cols-3 gap-3">
        <Stat label="Streak" value={`${streak} d`} />
        <Stat label="Logged" value={`${loggedDays}/${days}`} />
        <Stat label="Consistency" value={`${consistency}%`} />
      </section>

      <section className="card">
        <h2 className="font-semibold mb-1">Daily calories</h2>
        <p className="text-xs text-fg-muted mb-3">Avg {avgCalories} kcal · target {calorieTarget}</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={calorieSeries}>
              <CartesianGrid stroke="#1f2a24" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#6b7872" fontSize={11} interval="preserveStartEnd" />
              <YAxis stroke="#6b7872" fontSize={11} width={32} />
              <Tooltip
                contentStyle={{ background: "#161e1a", border: "1px solid #1f2a24", borderRadius: 12 }}
                labelStyle={{ color: "#9aa8a0" }}
              />
              {calorieTarget > 0 && (
                <ReferenceLine y={calorieTarget} stroke="#22c55e" strokeDasharray="4 4" />
              )}
              <Line
                type="monotone"
                dataKey="calories"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 3, fill: "#22c55e" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-3">Avg macros ({range === "week" ? "7d" : "30d"})</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={macroAvg}>
              <CartesianGrid stroke="#1f2a24" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#6b7872" fontSize={11} />
              <YAxis stroke="#6b7872" fontSize={11} width={32} />
              <Tooltip
                contentStyle={{ background: "#161e1a", border: "1px solid #1f2a24", borderRadius: 12 }}
                labelStyle={{ color: "#9aa8a0" }}
              />
              <Bar dataKey="grams" fill="#22c55e" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-3">Weight</h2>
        {weightSeries.length === 0 ? (
          <div className="text-sm text-fg-dim py-2">No weight data in this range.</div>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightSeries}>
                <CartesianGrid stroke="#1f2a24" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#6b7872" fontSize={11} />
                <YAxis stroke="#6b7872" fontSize={11} width={32} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ background: "#161e1a", border: "1px solid #1f2a24", borderRadius: 12 }}
                  labelStyle={{ color: "#9aa8a0" }}
                />
                <Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: "#3b82f6" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {loading && <div className="text-center text-fg-dim text-sm">Loading...</div>}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card text-center">
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-fg-muted">{label}</div>
    </div>
  );
}

function shortLabel(iso: string, range: Range): string {
  const d = fromISO(iso);
  if (range === "week") {
    return d.toLocaleDateString(undefined, { weekday: "short" });
  }
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

