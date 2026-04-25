export type Gender = "male" | "female" | "other";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "very";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
};

// Mifflin-St Jeor BMR
export function calculateBMR(opts: {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
}): number {
  const { weightKg, heightCm, age, gender } = opts;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === "male") return base + 5;
  if (gender === "female") return base - 161;
  // 'other' — average of male/female offsets
  return base - 78;
}

export function calculateTDEE(opts: {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
}): number {
  const bmr = calculateBMR(opts);
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[opts.activityLevel]);
}

export type MacroTargets = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

// Protein 2 g/kg, then 45% of remaining calories from carbs, 30% from fat.
// (Remaining 25% intentionally unallocated as a buffer.)
export function calculateMacroTargets(opts: {
  weightKg: number;
  tdee: number;
}): MacroTargets {
  const protein_g = Math.round(opts.weightKg * 2);
  const proteinKcal = protein_g * 4;
  const remaining = Math.max(0, opts.tdee - proteinKcal);
  const carbsKcal = remaining * 0.45;
  const fatKcal = remaining * 0.3;
  return {
    calories: opts.tdee,
    protein_g,
    carbs_g: Math.round(carbsKcal / 4),
    fat_g: Math.round(fatKcal / 9),
  };
}
