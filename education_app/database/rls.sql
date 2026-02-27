-- =============================================================================
-- Row Level Security (RLS) Policies
-- Run AFTER schema.sql in the Supabase SQL Editor
-- =============================================================================

-- =============================================================================
-- Enable RLS on every table
-- =============================================================================
ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress           ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- Helper: resolve app user_id from the JWT sub (auth.uid())
-- =============================================================================
-- auth.uid() returns the UUID stored in the JWT issued by Supabase Auth.
-- Our public.users.auth_user_id column mirrors that value.


-- =============================================================================
-- USERS table policies
-- Users can read and update only their own profile row.
-- =============================================================================
CREATE POLICY "users_select_own"
ON public.users
FOR SELECT
USING (auth_user_id = auth.uid());

CREATE POLICY "users_update_own"
ON public.users
FOR UPDATE
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Service role (backend) can insert new user rows during sign-up
CREATE POLICY "users_insert_service"
ON public.users
FOR INSERT
WITH CHECK (true);  -- tighten to specific role if desired


-- =============================================================================
-- QUIZ ATTEMPTS policies
-- Users can read and insert only their own quiz attempts.
-- No update/delete — attempts are immutable records.
-- =============================================================================
CREATE POLICY "quiz_attempts_select_own"
ON public.quiz_attempts
FOR SELECT
USING (
    user_id = (
        SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
);

CREATE POLICY "quiz_attempts_insert_own"
ON public.quiz_attempts
FOR INSERT
WITH CHECK (
    user_id = (
        SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
);


-- =============================================================================
-- PREDICTION ATTEMPTS policies
-- =============================================================================
CREATE POLICY "prediction_attempts_select_own"
ON public.prediction_attempts
FOR SELECT
USING (
    user_id = (
        SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
);

CREATE POLICY "prediction_attempts_insert_own"
ON public.prediction_attempts
FOR INSERT
WITH CHECK (
    user_id = (
        SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
);


-- =============================================================================
-- STREAKS policies
-- Users can read and upsert only their own streak row.
-- =============================================================================
CREATE POLICY "streaks_select_own"
ON public.streaks
FOR SELECT
USING (
    user_id = (
        SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
);

CREATE POLICY "streaks_insert_own"
ON public.streaks
FOR INSERT
WITH CHECK (
    user_id = (
        SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
);

CREATE POLICY "streaks_update_own"
ON public.streaks
FOR UPDATE
USING (
    user_id = (
        SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
)
WITH CHECK (
    user_id = (
        SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
);


-- =============================================================================
-- PROGRESS policies
-- =============================================================================
CREATE POLICY "progress_select_own"
ON public.progress
FOR SELECT
USING (
    user_id = (
        SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
);

CREATE POLICY "progress_insert_own"
ON public.progress
FOR INSERT
WITH CHECK (
    user_id = (
        SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
);

CREATE POLICY "progress_update_own"
ON public.progress
FOR UPDATE
USING (
    user_id = (
        SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
)
WITH CHECK (
    user_id = (
        SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
);