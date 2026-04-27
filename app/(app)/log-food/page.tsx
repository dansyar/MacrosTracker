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

  // Photo flow — two inputs so the user can choose camera vs. gallery
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
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

      <div className="card grid grid-cols-2 gap-3 !p-3">
        <div>
          <label className="label">Date</label>
          <input
            type="date"
            className="input"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
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
          cameraInputRef={cameraInputRef}
          galleryInputRef={galleryInputRef}
          onPhotoChange={onPhotoChange}
          onCancel={() => {
            setResult(null);
            setPreviewUrl(null);
            if (cameraInputRef.current) cameraInputRef.current.value = "";
            if (galleryInputRef.current) galleryInputRef.current.value = "";
          }}
          onSave={saveResult}
        />
      ) : (
        <ManualFlow
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
  cameraInputRef,
  galleryInputRef,
  onPhotoChange,
  onCancel,
  onSave,
}: {
  previewUrl: string | null;
  analysing: boolean;
  result: AnalysisResult | null;
  cameraInputRef: React.RefObject<HTMLInputElement>;
  galleryInputRef: React.RefObject<HTMLInputElement>;
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
      <div className="card text-center py-7 px-4 space-y-4 border-dashed">
        <div>
          <div className="text-5xl mb-2">📷</div>
          <p className="font-semibold">Add a food photo</p>
          <p className="text-fg-muted text-sm mt-1 max-w-[30ch] mx-auto">
            Claude will estimate the macros for you.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label
            htmlFor="food-photo-camera"
            className="btn-primary flex items-center justify-center gap-1.5 cursor-pointer select-none"
          >
            <CameraIcon /> Take photo
          </label>
          <label
            htmlFor="food-photo-gallery"
            className="btn-secondary flex items-center justify-center gap-1.5 cursor-pointer select-none"
          >
            <GalleryIcon /> Gallery
          </label>
        </div>
        <input
          id="food-photo-camera"
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onPhotoChange}
        />
        <input
          id="food-photo-gallery"
          ref={galleryInputRef}
          type="file"
          accept="image/*"
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

type ManualSave = {
  food_name: string;
  portion: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

type SearchResult = {
  id: number;
  name: string;
  brand: string | null;
  per_100g: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  serving_size: number | null;
  serving_unit: string | null;
};

function ManualFlow({ onSave }: { onSave: (vals: ManualSave) => void }) {
  const [mode, setMode] = useState<"search" | "custom">("search");
  return mode === "search" ? (
    <USDASearchForm onSave={onSave} switchToCustom={() => setMode("custom")} />
  ) : (
    <CustomEntryForm onSave={onSave} switchToSearch={() => setMode("search")} />
  );
}

function USDASearchForm({
  onSave,
  switchToCustom,
}: {
  onSave: (vals: ManualSave) => void;
  switchToCustom: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [grams, setGrams] = useState<number>(100);

  useEffect(() => {
    if (selected) return;
    if (query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/food-search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("search failed");
        const data = await res.json();
        if (!cancelled) {
          setResults(data.items || []);
          setSearched(true);
        }
      } catch {
        if (!cancelled) toast.error("Search failed");
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, selected]);

  if (selected) {
    const factor = grams / 100;
    const totals = {
      calories: Math.round(selected.per_100g.calories * factor),
      protein_g: Math.round(selected.per_100g.protein_g * factor * 10) / 10,
      carbs_g: Math.round(selected.per_100g.carbs_g * factor * 10) / 10,
      fat_g: Math.round(selected.per_100g.fat_g * factor * 10) / 10,
    };
    return (
      <div className="card space-y-3">
        <div>
          <div className="text-xs text-accent uppercase tracking-wide font-semibold">USDA match</div>
          <div className="font-medium mt-1">{selected.name}</div>
          {selected.brand && <div className="text-xs text-fg-muted">{selected.brand}</div>}
        </div>
        <div>
          <label className="label">Portion (g)</label>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            min={0}
            value={grams}
            onChange={(e) => setGrams(Number(e.target.value) || 0)}
            autoFocus
          />
          {selected.serving_size && selected.serving_unit === "g" ? (
            <button
              type="button"
              className="text-xs text-accent hover:underline mt-1"
              onClick={() => setGrams(selected.serving_size!)}
            >
              Use typical serving ({selected.serving_size}{selected.serving_unit})
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <MiniStat label="kcal" value={totals.calories} />
          <MiniStat label="P" value={`${totals.protein_g}g`} />
          <MiniStat label="C" value={`${totals.carbs_g}g`} />
          <MiniStat label="F" value={`${totals.fat_g}g`} />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={() => setSelected(null)} className="btn-secondary flex-1">
            Back
          </button>
          <button
            onClick={() =>
              onSave({
                food_name: selected.name,
                portion: `${grams} g`,
                calories: totals.calories,
                protein_g: totals.protein_g,
                carbs_g: totals.carbs_g,
                fat_g: totals.fat_g,
              })
            }
            className="btn-primary flex-1"
            disabled={grams <= 0}
          >
            Save entry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card space-y-3">
      <div>
        <label className="label">Search foods</label>
        <input
          className="input"
          placeholder="e.g. chicken breast, banana, oatmeal"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="text-xs text-fg-dim mt-1">Powered by USDA FoodData Central</div>
      </div>

      {searching && <div className="text-sm text-fg-dim">Searching...</div>}

      {!searching && searched && results.length === 0 && (
        <div className="text-sm text-fg-dim">No matches found.</div>
      )}

      {results.length > 0 && (
        <ul className="divide-y divide-border max-h-80 overflow-y-auto -mx-1">
          {results.map((r) => (
            <li key={r.id}>
              <button
                className="w-full text-left p-2 hover:bg-bg-elevated rounded-lg transition"
                onClick={() => setSelected(r)}
              >
                <div className="font-medium truncate">{r.name}</div>
                <div className="text-xs text-fg-muted flex justify-between gap-2">
                  <span className="truncate">{r.brand || "Generic"}</span>
                  <span className="shrink-0 tabular-nums">{r.per_100g.calories} kcal/100g</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={switchToCustom}
        className="text-sm text-fg-muted hover:text-fg w-full text-center pt-3 border-t border-border"
      >
        Can't find it? Enter values manually →
      </button>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-bg-elevated rounded-lg py-2">
      <div className="text-base font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-fg-muted">{label}</div>
    </div>
  );
}

function CustomEntryForm({
  onSave,
  switchToSearch,
}: {
  onSave: (vals: ManualSave) => void;
  switchToSearch: () => void;
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
      <button
        type="button"
        onClick={switchToSearch}
        className="text-sm text-fg-muted hover:text-fg w-full text-center pt-1"
      >
        ← Search USDA database instead
      </button>
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

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}
