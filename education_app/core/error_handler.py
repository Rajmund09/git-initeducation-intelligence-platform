"""
education_app/database/README.md  ← save as a .md for reference

ERROR HANDLING BEST PRACTICES
==============================

1. NEVER let a DB error crash an API response
   ─────────────────────────────────────────────
   Every database function wraps its body in try/except and returns a
   structured dict with a "success" boolean.  The service layer checks
   that flag and logs a warning, but the HTTP response is still returned.

   Pattern:
       result = save_quiz_attempt(user_id, score)
       if not result["success"]:
           logger.warning("Could not persist quiz: %s", result["error"])
       # continue building response regardless

2. STRUCTURED return type (always)
   ─────────────────────────────────────────────
   Success:  {"success": True,  "data": <supabase row(s)>}
   Failure:  {"success": False, "error": "<message>", "operation": "<fn name>"}

   FastAPI routes can forward db_result to the client for debugging in dev,
   and strip it in production via a response model that excludes db_result.

3. ENVIRONMENT variable guard at startup
   ─────────────────────────────────────────────
   _bootstrap_client() raises EnvironmentError immediately if SUPABASE_URL or
   SUPABASE_KEY are missing.  This surfaces misconfigurations at deploy-time,
   not at the first DB call at runtime.

   Deployment checklist:
       export SUPABASE_URL="https://<project>.supabase.co"
       export SUPABASE_KEY="<service_role_or_anon_key>"
   Or use a .env file with python-dotenv:
       from dotenv import load_dotenv
       load_dotenv()                      # call before importing supabase_client

4. LOGGING strategy
   ─────────────────────────────────────────────
   - logger.error()  → unexpected exceptions (includes exc_info=True for stack)
   - logger.warning() → expected soft failures (quota, constraint violations)
   - logger.info()   → successful client init, major lifecycle events
   Use a structured log formatter (JSON) in production so errors are queryable
   in CloudWatch / Datadog / Supabase Log Drain.

5. SUPABASE-specific gotchas
   ─────────────────────────────────────────────
   a. Supabase Python client raises exceptions for network errors and
      auth failures; always catch the base Exception.
   b. response.data returns [] (not None) when no rows match — check length.
   c. upsert(on_conflict=...) requires the conflict column to be UNIQUE in
      the schema (enforced by the SQL above).
   d. RLS is only enforced when using the anon key with a user JWT.
      The service_role key bypasses RLS — use it only server-side.

6. RETRY policy (production recommendation)
   ─────────────────────────────────────────────
   For write operations use exponential backoff via tenacity:

       from tenacity import retry, stop_after_attempt, wait_exponential

       @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, max=8))
       def _insert_with_retry(table, payload):
           return supabase.table(table).insert(payload).execute()

7. SECRETS management
   ─────────────────────────────────────────────
   - Local dev   : python-dotenv + .env (git-ignored)
   - CI/CD       : GitHub Secrets / GitLab CI Variables
   - Production  : AWS Secrets Manager / GCP Secret Manager / Supabase Vault
   Never hard-code keys in source files.

8. CONNECTION pooling
   ─────────────────────────────────────────────
   The Supabase Python client uses httpx under the hood.  For high-throughput
   FastAPI deployments, enable PgBouncer in Supabase (Dashboard → Database →
   Connection Pooling) and use the pooler connection string in SUPABASE_URL.

9. TESTING
   ─────────────────────────────────────────────
   Mock the module-level `supabase` object in unit tests:

       import education_app.database.supabase_client as db_module
       from unittest.mock import MagicMock, patch

       def test_save_quiz_attempt_success(monkeypatch):
           mock_client = MagicMock()
           mock_client.table.return_value.insert.return_value.execute.return_value.data = [{"id": "abc"}]
           monkeypatch.setattr(db_module, "supabase", mock_client)
           result = db_module.save_quiz_attempt("user-123", 87.5)
           assert result["success"] is True

10. SCHEMA MIGRATIONS
    ─────────────────────────────────────────────
    Use Supabase's built-in migration tool or supabase-cli:
        supabase migration new add_badges_column
        supabase db push
    Never run raw ALTER TABLE in production without a migration file.
"""