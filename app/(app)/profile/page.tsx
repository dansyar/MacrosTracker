"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import toast from "react-hot-toast";
import { calculateTDEE, calculateMacroTargets } from "@/lib/macros";

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile").then(async (r) => {
      if (r.ok) setProfile(await r.json());
    });
  }, []);

  if (!profile) {
    return <main className="px-4 pt-6 text-fg-dim">Loading...</main>;
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
        <h2 className="font-semibold mb-3">Targets</h2>
        <div className="grid grid-cols-4 gap-2 text-center">
          <Stat label="kcal" value={profile.tdee ?? preview?.tdee ?? "—"} />
          <Stat label="Protein" value={profile.protein_target_g ?? preview?.protein_g ?? "—"} suffix="g" />
          <Stat label="Carbs" value={profile.carbs_target_g ?? preview?.carbs_g ?? "—"} suffix="g" />
          <Stat label="Fat" value={profile.fat_target_g ?? preview?.fat_g ?? "—"} suffix="g" />
        </div>
        <p className="text-xs text-fg-dim mt-3">
          Targets recalculate automatically from Mifflin-St Jeor when you save your stats.
        </p>
      </section>
    </main>
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
