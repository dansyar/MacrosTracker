import { sql } from "@vercel/postgres";

export { sql };

export type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  name: string | null;
  age: number | null;
  weight_kg: string | null;
  height_cm: string | null;
  gender: "male" | "female" | "other" | null;
  activity_level: "sedentary" | "light" | "moderate" | "very" | null;
  tdee: number | null;
  protein_target_g: number | null;
  carbs_target_g: number | null;
  fat_target_g: number | null;
  created_at: string;
  updated_at: string;
};

export type FoodLogRow = {
  id: number;
  user_id: number;
  date: string;
  meal_category: "breakfast" | "lunch" | "dinner" | "snacks";
  food_name: string;
  portion: string | null;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  photo_url: string | null;
  created_at: string;
};

export type ExerciseLogRow = {
  id: number;
  user_id: number;
  date: string;
  exercise_name: string;
  duration_mins: number;
  calories_burned: string;
  created_at: string;
};

export type WeightLogRow = {
  id: number;
  user_id: number;
  date: string;
  weight_kg: string;
  created_at: string;
};

export type WaterLogRow = {
  id: number;
  user_id: number;
  date: string;
  cups: number;
  updated_at: string;
};
