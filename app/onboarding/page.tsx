"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { calculateTDEE, calculateMacroTargets } from "@/lib/macros";

type Gender = "male" | "female" | "other";
type Activity = "sedentary" | "light" | "moderate" | "very";

const ACTIVITY_LABELS: Record<Activity, string> = {
  sedentary: "Sedentary (little to no exercise)",
  light: "Lightly active (1–3 days/week)",
  moderate: "Moderately active (3–5 days/week)",
  very: "Very active (6–7 days/week)",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [weight, setWeight] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [gender, setGender] = useState<Gender>("male");
  const [activity, setActivity] = useState<Activity>("moderate");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/profile").then(async (r) => {
      if (!r.ok) return;
      const d = await r.json();
      if (d.name) setName(d.name);
      if (d.age) setAge(d.age);
      if (d.weight_kg) setWeight(d.weight_kg);
      if (d.height_cm) setHeight(d.height_cm);
      if (d.gender) setGender(d.gender);
      if (d.activity_level) setActivity(d.activity_level);
    });
  }, []);

  const ready =
    !!name && typeof age === "number" && typeof weight === "number" && typeof height === "number";

  const preview = ready
    ? (() => {
        const tdee = calculateTDEE({
          weightKg: weight as number,
          heightCm: height as number,
          age: age as number,
          gender,
          activityLevel: activity,
        });
        const m = calculateMacroTargets({ weightKg: weight as number, tdee });
        return { tdee, ...m };
      })()
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setLoading(true);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        age,
        weight_kg: weight,
        height_cm: height,
        gender,
        activity_level: activity,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Could not save profile");
      return;
    }
    toast.success("Profile saved");
    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-1">Welcome to MacrosTracker</h1>
      <p className="text-fg-muted mb-6">A few quick details so we can dial in your targets.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Age</label>
              <input
                className="input"
                type="number"
                inputMode="numeric"
                min={10}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="label">Gender</label>
              <select
                className="input"
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Weight (kg)</label>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                step="0.1"
                min={20}
                max={400}
                value={weight}
                onChange={(e) => setWeight(e.target.value === "" ? "" : Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="label">Height (cm)</label>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                step="0.1"
                min={80}
                max={250}
                value={height}
                onChange={(e) => setHeight(e.target.value === "" ? "" : Number(e.target.value))}
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Activity level</label>
            <select
              className="input"
              value={activity}
              onChange={(e) => setActivity(e.target.value as Activity)}
            >
              {(Object.keys(ACTIVITY_LABELS) as Activity[]).map((k) => (
                <option key={k} value={k}>{ACTIVITY_LABELS[k]}</option>
              ))}
            </select>
          </div>
        </div>

        {preview && (
          <div className="card">
            <p className="text-sm text-fg-muted mb-2">Calculated targets</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <Stat label="kcal" value={preview.calories} />
              <Stat label="Protein" value={`${preview.protein_g}g`} />
              <Stat label="Carbs" value={`${preview.carbs_g}g`} />
              <Stat label="Fat" value={`${preview.fat_g}g`} />
            </div>
          </div>
        )}

        <button type="submit" disabled={!ready || loading} className="btn-primary w-full">
          {loading ? "Saving..." : "Save & continue"}
        </button>
      </form>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-bg-elevated rounded-xl py-2">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-fg-muted">{label}</div>
    </div>
  );
}
