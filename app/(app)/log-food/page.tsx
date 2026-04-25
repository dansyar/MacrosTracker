"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { todayISO } from "@/lib/dates";

type Meal = "breakfast" | "lunch" | "dinner" | "snacks";

type AnalysisResult = {
  food_name: string;
  portion_estimate: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence_note: string;
};

const MEAL_LABELS: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

function defaultMealForNow(): Meal {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 14) return "lunch";
  if (h < 18) return "snacks";
  return "dinner";
}

function LogFoodInner() {
  const router = useRouter();
  const search = useSearchParams();
  const [tab, setTab] = useState<"photo" | "manual">("photo");
  const [date, setDate] = useState(() => search.get("date") || todayISO());
  const [meal, setMeal] = useState<Meal>(
    (search.get("meal") as Meal) || defaultMealForNow(),
  );

  // Photo flow
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setPreviewUrl(URL.createObjectURL(file));
    setAnalysing(true);

    const fd = new FormData();
    fd.append("photo", file);
    try {
      const res = await fetch("/api/analyse-food", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Analysis failed");
      }
      const data = (await res.json()) as AnalysisResult;
      setResult(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalysing(false);
    }
  }

  async function saveResult(values: AnalysisResult) {
    const res = await fetch("/api/food-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        meal_category: meal,
        food_name: values.food_name,
        portion: values.portion_estimate,
        calories: values.calories,
        protein_g: values.protein_g,
        carbs_g: values.carbs_g,
        fat_g: values.fat_g,
      }),
    });
    if (!res.ok) {
      toast.error("Could not save");
      return;
    }
    toast.success("Logged");
    router.push(`/food-log?date=${date}`);
    router.refresh();
  }

  return (
    <main className="px-4 pt-6 pb-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Add food</h1>
        <button onClick={() => router.back()} className="btn-ghost text-sm">Cancel</button>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="card !p-3">
          <label className="label">Date</label>
          <input
            type="date"
            className="input"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="card !p-3">
          <label className="label">Meal</label>
          <select
            className="input"
            value={meal}
            onChange={(e) => setMeal(e.target.value as Meal)}
          >
            {(Object.keys(MEAL_LABELS) as Meal[]).map((m) => (
              <option key={m} value={m}>{MEAL_LABELS[m]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 bg-bg-elevated p-1 rounded-xl border border-border">
        <button
          onClick={() => setTab("photo")}
          className={`py-2 rounded-lg text-sm font-medium transition ${
            tab === "photo" ? "bg-accent text-black" : "text-fg-muted"
          }`}
        >
          Photo
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

      {tab === "photo" ? (
        <PhotoFlow
          previewUrl={previewUrl}
          analysing={analysing}
          result={result}
          fileInputRef={fileInputRef}
          onPhotoChange={onPhotoChange}
          onCancel={() => {
            setResult(null);
            setPreviewUrl(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
          onSave={saveResult}
        />
      ) : (
        <ManualForm
          onSave={(vals) =>
            saveResult({
              food_name: vals.food_name,
              portion_estimate: vals.portion ?? "",
              calories: vals.calories,
              protein_g: vals.protein_g,
              carbs_g: vals.carbs_g,
              fat_g: vals.fat_g,
              confidence_note: "",
            })
          }
        />
      )}
    </main>
  );
}

function PhotoFlow({
  previewUrl,
  analysing,
  result,
  fileInputRef,
  onPhotoChange,
  onCancel,
  onSave,
}: {
  previewUrl: string | null;
  analysing: boolean;
  result: AnalysisResult | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCancel: () => void;
  onSave: (vals: AnalysisResult) => void;
}) {
  const [edited, setEdited] = useState<AnalysisResult | null>(null);
  useEffect(() => {
    setEdited(result);
  }, [result]);

  if (!previewUrl) {
    return (
      <div className="card text-center py-10 space-y-3">
        <div className="text-4xl">📷</div>
        <p className="text-fg-muted text-sm">Snap a photo of your meal — Claude will estimate the macros.</p>
        <button onClick={() => fileInputRef.current?.click()} className="btn-primary">
          Take or upload photo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onPhotoChange}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="card !p-2 relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="Food preview" className="w-full max-h-64 object-cover rounded-xl" />
      </div>

      {analysing && (
        <div className="card space-y-3">
          <p className="text-sm text-fg-muted">Analysing photo with Claude...</p>
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-bg-elevated rounded w-3/4" />
            <div className="h-3 bg-bg-elevated rounded w-1/2" />
            <div className="h-2 bg-bg-elevated rounded" />
            <div className="h-2 bg-bg-elevated rounded w-5/6" />
          </div>
        </div>
      )}

      {edited && !analysing && (
        <ConfirmCard
          values={edited}
          onChange={setEdited}
          onSave={() => onSave(edited)}
          onCancel={onCancel}
        />
      )}

      {!analysing && !edited && (
        <button onClick={onCancel} className="btn-secondary w-full">Pick another photo</button>
      )}
    </div>
  );
}

function ConfirmCard({
  values,
  onChange,
  onSave,
  onCancel,
}: {
  values: AnalysisResult;
  onChange: (v: AnalysisResult) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="card space-y-3">
      <div>
        <div className="text-xs text-accent uppercase tracking-wide font-semibold">AI estimate</div>
        <p className="text-xs text-fg-muted mt-1">{values.confidence_note}</p>
      </div>
      <div>
        <label className="label">Food</label>
        <input
          className="input"
          value={values.food_name}
          onChange={(e) => onChange({ ...values, food_name: e.target.value })}
        />
      </div>
      <div>
        <label className="label">Portion</label>
        <input
          className="input"
          value={values.portion_estimate}
          onChange={(e) => onChange({ ...values, portion_estimate: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Calories" value={values.calories} onChange={(v) => onChange({ ...values, calories: v })} />
        <NumberField label="Protein (g)" value={values.protein_g} onChange={(v) => onChange({ ...values, protein_g: v })} />
        <NumberField label="Carbs (g)" value={values.carbs_g} onChange={(v) => onChange({ ...values, carbs_g: v })} />
        <NumberField label="Fat (g)" value={values.fat_g} onChange={(v) => onChange({ ...values, fat_g: v })} />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="btn-secondary flex-1">Discard</button>
        <button onClick={onSave} className="btn-primary flex-1">Save entry</button>
      </div>
    </div>
  );
}

function ManualForm({
  onSave,
}: {
  onSave: (vals: {
    food_name: string;
    portion: string | null;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [portion, setPortion] = useState("");
  const [cal, setCal] = useState<number>(0);
  const [p, setP] = useState<number>(0);
  const [c, setC] = useState<number>(0);
  const [f, setF] = useState<number>(0);

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
          food_name: name.trim(),
          portion: portion.trim() || null,
          calories: cal,
          protein_g: p,
          carbs_g: c,
          fat_g: f,
        });
      }}
    >
      <div>
        <label className="label">Food name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="label">Portion (optional)</label>
        <input className="input" value={portion} onChange={(e) => setPortion(e.target.value)} placeholder="e.g. 1 cup" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Calories" value={cal} onChange={setCal} />
        <NumberField label="Protein (g)" value={p} onChange={setP} />
        <NumberField label="Carbs (g)" value={c} onChange={setC} />
        <NumberField label="Fat (g)" value={f} onChange={setF} />
      </div>
      <button type="submit" className="btn-primary w-full">Save entry</button>
    </form>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        type="number"
        inputMode="decimal"
        step="1"
        min={0}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}

export default function LogFoodPage() {
  return (
    <Suspense fallback={<div className="px-4 pt-6 text-fg-dim">Loading...</div>}>
      <LogFoodInner />
    </Suspense>
  );
}
