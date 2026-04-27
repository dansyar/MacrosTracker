"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import toast from "react-hot-toast";
import { calculateTDEE, calculateMacroTargets } from "@/lib/macros";
import { Skeleton } from "@/components/Skeleton";

type Profile = {
  email: string;
  name: string | null;
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  gender: "male" | "female" | "other" | null;
  activity_level: "sedentary" | "light" | "moderate" | "very" | null;
  tdee: number | null;
  protein_target_g: number | null;
  carbs_target_g: number | null;
  fat_target_g: number | null;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [editingTargets, setEditingTargets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftTargets, setDraftTargets] = useState<{
    tdee: number;
    protein_target_g: number;
    carbs_target_g: number;
    fat_target_g: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/profile").then(async (r) => {
      if (r.ok) setProfile(await r.json());
    });
  }, []);

  if (!profile) {
    return (
      <main className="px-4 pt-6 pb-6 space-y-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </main>
    );
  }

  const preview =
    profile.weight_kg && profile.height_cm && profile.age && profile.gender && profile.activity_level
      ? (() => {
          const tdee = calculateTDEE({
            weightKg: profile.weight_kg!,
            heightCm: profile.height_cm!,
            age: profile.age!,
            gender: profile.gender!,
            activityLevel: profile.activity_level!,
          });
          return { tdee, ...calculateMacroTargets({ weightKg: profile.weight_kg!, tdee }) };
        })()
      : null;

  function startEditingTargets() {
    if (!profile) return;
    setDraftTargets({
      tdee: profile.tdee ?? preview?.tdee ?? 0,
      protein_target_g: profile.protein_target_g ?? preview?.protein_g ?? 0,
      carbs_target_g: profile.carbs_target_g ?? preview?.carbs_g ?? 0,
      fat_target_g: profile.fat_target_g ?? preview?.fat_g ?? 0,
    });
    setEditingTargets(true);
  }

  async function saveTargets() {
    if (!draftTargets) return;
    setSaving(true);
    const res = await fetch("/api/profile/targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draftTargets),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Could not save targets");
      return;
    }
    setProfile((p) => (p ? { ...p, ...draftTargets } : p));
    toast.success("Targets updated");
    setEditingTargets(false);
  }

  async function resetTargets() {
    if (!confirm("Reset to auto-calculated targets?")) return;
    setSaving(true);
    const res = await fetch("/api/profile/targets", { method: "DELETE" });
    setSaving(false);
    if (!res.ok) {
      toast.error("Could not reset");
      return;
    }
    const data = (await res.json()) as {
      tdee: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
    };
    setProfile((p) =>
      p
        ? {
            ...p,
            tdee: data.tdee,
            protein_target_g: data.protein_g,
            carbs_target_g: data.carbs_g,
            fat_target_g: data.fat_g,
          }
        : p,
    );
    toast.success("Reset to auto-calculated");
    setEditingTargets(false);
  }

  async function save() {
    if (!profile) return;
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: profile.name,
        age: profile.age,
        weight_kg: profile.weight_kg,
        height_cm: profile.height_cm,
        gender: profile.gender,
        activity_level: profile.activity_level,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Could not save");
      return;
    }
    const updated = await res.json();
    setProfile((p) => (p ? { ...p, ...updated } : p));
    toast.success("Profile updated");
    setEditing(false);
  }

  return (
    <main className="px-4 pt-6 pb-6 space-y-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Profile</h1>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="btn-ghost text-sm">
          Sign out
        </button>
      </header>

      <section className="card space-y-1">
        <div className="text-sm text-fg-muted">Signed in as</div>
        <div className="font-medium">{profile.email}</div>
      </section>

      <section className="card">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-semibold">Stats</h2>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="text-accent text-sm hover:underline">
              Edit
            </button>
          ) : (
            <button onClick={() => setEditing(false)} className="text-fg-muted text-sm hover:underline">
              Cancel
            </button>
          )}
        </div>

        {!editing ? (
          <ul className="space-y-1 text-sm">
            <Row label="Name" value={profile.name ?? "—"} />
            <Row label="Age" value={profile.age ?? "—"} />
            <Row label="Weight" value={profile.weight_kg ? `${profile.weight_kg} kg` : "—"} />
            <Row label="Height" value={profile.height_cm ? `${profile.height_cm} cm` : "—"} />
            <Row label="Gender" value={profile.gender ?? "—"} />
            <Row label="Activity" value={profile.activity_level ?? "—"} />
          </ul>
        ) : (
          <div className="space-y-3">
            <Field label="Name">
              <input
                className="input"
                value={profile.name ?? ""}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Age">
                <input
                  className="input"
                  type="number"
                  value={profile.age ?? ""}
                  onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) || null })}
                />
              </Field>
              <Field label="Gender">
                <select
                  className="input"
                  value={profile.gender ?? "male"}
                  onChange={(e) => setProfile({ ...profile, gender: e.target.value as Profile["gender"] })}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Weight (kg)">
                <input
                  className="input"
                  type="number"
                  step="0.1"
                  value={profile.weight_kg ?? ""}
                  onChange={(e) => setProfile({ ...profile, weight_kg: Number(e.target.value) || null })}
                />
              </Field>
              <Field label="Height (cm)">
                <input
                  className="input"
                  type="number"
                  step="0.1"
                  value={profile.height_cm ?? ""}
                  onChange={(e) => setProfile({ ...profile, height_cm: Number(e.target.value) || null })}
                />
              </Field>
            </div>
            <Field label="Activity level">
              <select
                className="input"
                value={profile.activity_level ?? "moderate"}
                onChange={(e) => setProfile({ ...profile, activity_level: e.target.value as Profile["activity_level"] })}
              >
                <option value="sedentary">Sedentary</option>
                <option value="light">Lightly active</option>
                <option value="moderate">Moderately active</option>
                <option value="very">Very active</option>
              </select>
            </Field>
            <button onClick={save} disabled={saving} className="btn-primary w-full">
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-semibold">Targets</h2>
          {!editingTargets ? (
            <button onClick={startEditingTargets} className="text-accent text-sm hover:underline">
              Edit
            </button>
          ) : (
            <button onClick={() => setEditingTargets(false)} className="text-fg-muted text-sm hover:underline">
              Cancel
            </button>
          )}
        </div>

        {!editingTargets ? (
          <>
            <div className="grid grid-cols-4 gap-2 text-center">
              <Stat label="kcal" value={profile.tdee ?? preview?.tdee ?? "—"} />
              <Stat label="Protein" value={profile.protein_target_g ?? preview?.protein_g ?? "—"} suffix="g" />
              <Stat label="Carbs" value={profile.carbs_target_g ?? preview?.carbs_g ?? "—"} suffix="g" />
              <Stat label="Fat" value={profile.fat_target_g ?? preview?.fat_g ?? "—"} suffix="g" />
            </div>
            <p className="text-xs text-fg-dim mt-3">
              Auto-calculated from Mifflin-St Jeor. Tap Edit to set your own.
            </p>
          </>
        ) : (
          draftTargets && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Calories">
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    min={800}
                    max={8000}
                    value={draftTargets.tdee}
                    onChange={(e) =>
                      setDraftTargets({ ...draftTargets, tdee: Number(e.target.value) || 0 })
                    }
                  />
                </Field>
                <Field label="Protein (g)">
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={800}
                    value={draftTargets.protein_target_g}
                    onChange={(e) =>
                      setDraftTargets({ ...draftTargets, protein_target_g: Number(e.target.value) || 0 })
                    }
                  />
                </Field>
                <Field label="Carbs (g)">
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={2000}
                    value={draftTargets.carbs_target_g}
                    onChange={(e) =>
                      setDraftTargets({ ...draftTargets, carbs_target_g: Number(e.target.value) || 0 })
                    }
                  />
                </Field>
                <Field label="Fat (g)">
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={800}
                    value={draftTargets.fat_target_g}
                    onChange={(e) =>
                      setDraftTargets({ ...draftTargets, fat_target_g: Number(e.target.value) || 0 })
                    }
                  />
                </Field>
              </div>
              <MacroPctSummary draft={draftTargets} />
              <div className="grid grid-cols-2 gap-2">
                <button onClick={resetTargets} disabled={saving} className="btn-secondary">
                  Reset to auto
                </button>
                <button onClick={saveTargets} disabled={saving} className="btn-primary">
                  {saving ? "Saving..." : "Save targets"}
                </button>
              </div>
            </div>
          )
        )}
      </section>
    </main>
  );
}

function MacroPctSummary({
  draft,
}: {
  draft: { tdee: number; protein_target_g: number; carbs_target_g: number; fat_target_g: number };
}) {
  const macroKcal = draft.protein_target_g * 4 + draft.carbs_target_g * 4 + draft.fat_target_g * 9;
  const total = Math.max(1, draft.tdee);
  const pct = (n: number) => Math.round((n / total) * 100);
  const diff = macroKcal - draft.tdee;
  return (
    <div className="bg-bg-elevated rounded-xl p-3 text-xs space-y-1">
      <div className="flex justify-between">
        <span className="text-fg-muted">Macro split</span>
        <span className="tabular-nums">
          P {pct(draft.protein_target_g * 4)}% · C {pct(draft.carbs_target_g * 4)}% · F {pct(draft.fat_target_g * 9)}%
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-fg-muted">Macros total</span>
        <span className={`tabular-nums ${Math.abs(diff) > 50 ? "text-warn" : "text-fg-muted"}`}>
          {macroKcal} kcal {diff !== 0 && `(${diff > 0 ? "+" : ""}${diff} vs target)`}
        </span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <li className="flex justify-between border-b border-border last:border-0 py-1.5">
      <span className="text-fg-muted capitalize">{label}</span>
      <span className="capitalize">{value}</span>
    </li>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label">{label}</div>
      {children}
    </div>
  );
}
function Stat({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) {
  return (
    <div className="bg-bg-elevated rounded-xl py-2">
      <div className="text-base font-semibold tabular-nums">{value}{suffix ?? ""}</div>
      <div className="text-xs text-fg-muted">{label}</div>
    </div>
  );
}
