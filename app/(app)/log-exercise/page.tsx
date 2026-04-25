"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { DateNav } from "@/components/DateNav";
import { todayISO } from "@/lib/dates";

type ExerciseLog = {
  id: number;
  date: string;
  exercise_name: string;
  duration_mins: number;
  calories_burned: string;
};

type Estimate = {
  exercise_name: string;
  duration_mins: number;
  calories_burned: number;
  confidence_note: string;
};

export default function LogExercisePage() {
  const router = useRouter();
  const [date, setDate] = useState(() => todayISO());
  const [items, setItems] = useState<ExerciseLog[]>([]);
  const [tab, setTab] = useState<"ai" | "manual">("ai");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/exercise-logs?date=${date}`);
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function save(entry: { exercise_name: string; duration_mins: number; calories_burned: number }) {
    const res = await fetch("/api/exercise-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, ...entry }),
    });
    if (!res.ok) {
      toast.error("Could not save");
      return;
    }
    toast.success("Logged");
    reload();
    router.refresh();
  }

  async function remove(id: number) {
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`/api/exercise-logs/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const total = items.reduce((sum, i) => sum + Number(i.calories_burned), 0);

  return (
    <main className="px-4 pt-6 pb-6 space-y-4">
      <h1 className="text-2xl font-bold">Exercise</h1>
      <div className="card">
        <DateNav date={date} onChange={setDate} />
      </div>

      <div className="grid grid-cols-2 gap-1 bg-bg-elevated p-1 rounded-xl border border-border">
        <button
          onClick={() => setTab("ai")}
          className={`py-2 rounded-lg text-sm font-medium transition ${
            tab === "ai" ? "bg-accent text-black" : "text-fg-muted"
          }`}
        >
          AI estimate
        </button>
        <button
          onClick={() => setTab("manual")}
          className={`py-2 rounded-lg text-sm font-medium transition ${
            tab === "manual" ? "bg-accent text-black" : "text-fg-muted"
          }`}
        >
          Manual
        </button>
      </div>

      {tab === "ai" ? <AIForm onSave={save} /> : <ManualExerciseForm onSave={save} />}

      <section className="card">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="font-semibold">Today's exercise</h2>
          <div className="text-sm text-fg-muted tabular-nums">{Math.round(total)} kcal burned</div>
        </div>
        {loading ? (
          <div className="text-sm text-fg-dim py-2">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-fg-dim py-2">Nothing logged yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((e) => (
              <li key={e.id} className="py-2 flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{e.exercise_name}</div>
                  <div className="text-xs text-fg-muted">{e.duration_mins} min</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold tabular-nums">{Math.round(Number(e.calories_burned))}</div>
                  <button onClick={() => remove(e.id)} className="text-xs text-danger hover:underline">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function AIForm({ onSave }: { onSave: (e: { exercise_name: string; duration_mins: number; calories_burned: number }) => void }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<Estimate | null>(null);

  async function estimateNow() {
    if (text.trim().length < 3) {
      toast.error("Describe what you did");
      return;
    }
    setLoading(true);
    setEstimate(null);
    const res = await fetch("/api/analyse-exercise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: text }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Estimation failed");
      return;
    }
    setEstimate(await res.json());
  }

  return (
    <div className="card space-y-3">
      <div>
        <label className="label">Describe your session</label>
        <textarea
          className="input min-h-[80px]"
          placeholder='e.g. "30 min easy run, 5km" or "1h yoga"'
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <button onClick={estimateNow} disabled={loading} className="btn-secondary w-full">
        {loading ? "Estimating..." : "Estimate calories"}
      </button>

      {estimate && (
        <div className="border-t border-border pt-3 space-y-3">
          <p className="text-xs text-fg-muted">{estimate.confidence_note}</p>
          <div>
            <label className="label">Exercise</label>
            <input
              className="input"
              value={estimate.exercise_name}
              onChange={(e) => setEstimate({ ...estimate, exercise_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Duration (min)</label>
              <input
                className="input"
                type="number"
                value={estimate.duration_mins}
                onChange={(e) => setEstimate({ ...estimate, duration_mins: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="label">Calories</label>
              <input
                className="input"
                type="number"
                value={estimate.calories_burned}
                onChange={(e) => setEstimate({ ...estimate, calories_burned: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
          <button
            onClick={() => {
              onSave({
                exercise_name: estimate.exercise_name,
                duration_mins: estimate.duration_mins,
                calories_burned: estimate.calories_burned,
              });
              setEstimate(null);
              setText("");
            }}
            className="btn-primary w-full"
          >
            Save entry
          </button>
        </div>
      )}
    </div>
  );
}

function ManualExerciseForm({ onSave }: { onSave: (e: { exercise_name: string; duration_mins: number; calories_burned: number }) => void }) {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState<number>(30);
  const [calories, setCalories] = useState<number>(0);

  return (
    <form
      className="card space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) {
          toast.error("Name is required");
          return;
        }
        onSave({
          exercise_name: name.trim(),
          duration_mins: duration,
          calories_burned: calories,
        });
        setName("");
        setDuration(30);
        setCalories(0);
      }}
    >
      <div>
        <label className="label">Exercise</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Duration (min)</label>
          <input
            className="input"
            type="number"
            min={0}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="label">Calories burned</label>
          <input
            className="input"
            type="number"
            min={0}
            value={calories}
            onChange={(e) => setCalories(Number(e.target.value) || 0)}
          />
        </div>
      </div>
      <button type="submit" className="btn-primary w-full">Save entry</button>
    </form>
  );
}
