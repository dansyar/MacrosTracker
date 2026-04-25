-- MacrosTracker schema
-- Run via `npm run db:migrate` after setting POSTGRES_URL.

CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    name            TEXT,
    age             INTEGER,
    weight_kg       NUMERIC(6,2),
    height_cm       NUMERIC(6,2),
    gender          TEXT CHECK (gender IN ('male', 'female', 'other')),
    activity_level  TEXT CHECK (activity_level IN ('sedentary','light','moderate','very')),
    tdee            INTEGER,
    protein_target_g INTEGER,
    carbs_target_g  INTEGER,
    fat_target_g    INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS food_logs (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    meal_category   TEXT NOT NULL CHECK (meal_category IN ('breakfast','lunch','dinner','snacks')),
    food_name       TEXT NOT NULL,
    portion         TEXT,
    calories        NUMERIC(8,2) NOT NULL DEFAULT 0,
    protein_g       NUMERIC(8,2) NOT NULL DEFAULT 0,
    carbs_g         NUMERIC(8,2) NOT NULL DEFAULT 0,
    fat_g           NUMERIC(8,2) NOT NULL DEFAULT 0,
    photo_url       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS food_logs_user_date_idx ON food_logs(user_id, date);

CREATE TABLE IF NOT EXISTS exercise_logs (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    exercise_name   TEXT NOT NULL,
    duration_mins   INTEGER NOT NULL DEFAULT 0,
    calories_burned NUMERIC(8,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS exercise_logs_user_date_idx ON exercise_logs(user_id, date);

CREATE TABLE IF NOT EXISTS weight_logs (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    weight_kg       NUMERIC(6,2) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS water_logs (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    cups            INTEGER NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, date)
);
