
-- =============================================================================
-- Financial Education Intelligence System — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- =============================================================================

-- Enable the pgcrypto extension for gen_random_uuid() if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================================
-- TABLE: users
-- Mirrors Supabase Auth users; stores app-level profile data.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id    UUID UNIQUE NOT NULL,          -- references auth.users(id)
    email           TEXT UNIQUE NOT NULL,
    display_name    TEXT,
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index: fast lookup by auth identity
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users (auth_user_id);

-- Automatically keep updated_at current
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================================
-- TABLE: quiz_attempts
-- One row per quiz submission.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    score       NUMERIC(5, 2) NOT NULL CHECK (score >= 0 AND score <= 100),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes: filter by user and sort by time
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id    ON public.quiz_attempts (user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_created_at ON public.quiz_attempts (created_at DESC);


-- =============================================================================
-- TABLE: prediction_attempts
-- One row per user prediction with outcome calibration data.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.prediction_attempts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    ticker              TEXT,
    direction           TEXT CHECK (direction IN ('up', 'down', 'flat')),
    confidence          NUMERIC(5, 2) CHECK (confidence >= 0 AND confidence <= 100),
    actual_direction    TEXT CHECK (actual_direction IN ('up', 'down', 'flat')),
    correct             BOOLEAN,
    calibration_delta   NUMERIC(6, 4),              -- confidence − base_rate
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes: per-user analysis and chronological ordering
CREATE INDEX IF NOT EXISTS idx_prediction_attempts_user_id    ON public.prediction_attempts (user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_attempts_created_at ON public.prediction_attempts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prediction_attempts_ticker     ON public.prediction_attempts (ticker);


-- =============================================================================
-- TABLE: streaks
-- One row per user (upserted on each activity).
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.streaks (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    current_streak      INT NOT NULL DEFAULT 0,
    longest_streak      INT NOT NULL DEFAULT 0,
    last_activity_date  DATE,
    streak_broken       BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index: fast single-row lookup
CREATE INDEX IF NOT EXISTS idx_streaks_user_id ON public.streaks (user_id);


-- =============================================================================
-- TABLE: progress
-- One row per user (upserted on any progress event).
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.progress (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    modules_completed       INT NOT NULL DEFAULT 0,
    quiz_avg_score          NUMERIC(5, 2),
    prediction_accuracy     NUMERIC(5, 2),
    xp_total                INT NOT NULL DEFAULT 0,
    badges                  JSONB NOT NULL DEFAULT '[]'::JSONB,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index: fast single-row lookup
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON public.progress (user_id);
Claude