"""
education_app/database/supabase_client.py

Production-grade Supabase integration layer for the Financial Education Intelligence System.
Handles client initialization, all DB operations, and structured error responses.
"""

import logging
import os
from datetime import datetime, timezone
from typing import Any

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Client bootstrap (module-level singleton)
# ---------------------------------------------------------------------------

def _bootstrap_client() -> Client:
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_KEY", "").strip()

    if not url:
        raise EnvironmentError(
            "SUPABASE_URL is not set. "
            "Add it to your .env file or deployment environment."
        )
    if not key:
        raise EnvironmentError(
            "SUPABASE_KEY is not set. "
            "Add it to your .env file or deployment environment."
        )

    try:
        client = create_client(url, key)
        logger.info("Supabase client initialised successfully.")
        return client
    except Exception as exc:
        logger.critical("Failed to create Supabase client: %s", exc, exc_info=True)
        raise


supabase: Client = _bootstrap_client()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ok(data: Any) -> dict:
    return {"success": True, "data": data}


def _err(operation: str, exc: Exception) -> dict:
    logger.error("[DB:%s] %s", operation, exc, exc_info=True)
    return {"success": False, "error": str(exc), "operation": operation}


# ---------------------------------------------------------------------------
# Quiz attempts
# ---------------------------------------------------------------------------

def save_quiz_attempt(user_id: str, score: float) -> dict:
    """
    Persist a quiz attempt for the given user.

    Args:
        user_id: UUID of the authenticated user.
        score:   Numeric score (0–100).

    Returns:
        {"success": True, "data": <inserted row>} on success,
        {"success": False, "error": ..., "operation": ...} on failure.
    """
    try:
        payload = {
            "user_id": user_id,
            "score": score,
            "created_at": _utcnow(),
        }
        response = (
            supabase.table("quiz_attempts")
            .insert(payload)
            .execute()
        )
        return _ok(response.data)
    except Exception as exc:
        return _err("save_quiz_attempt", exc)


# ---------------------------------------------------------------------------
# Prediction attempts
# ---------------------------------------------------------------------------

def save_prediction_attempt(user_id: str, prediction_data: dict) -> dict:
    """
    Store a prediction calibration record.

    Args:
        user_id:         UUID of the authenticated user.
        prediction_data: Arbitrary dict with keys like
                         {"ticker", "direction", "confidence",
                          "actual_direction", "correct", "calibration_delta"}.

    Returns:
        Structured success / error dict.
    """
    try:
        payload = {
            "user_id": user_id,
            "created_at": _utcnow(),
            **prediction_data,
        }
        response = (
            supabase.table("prediction_attempts")
            .insert(payload)
            .execute()
        )
        return _ok(response.data)
    except Exception as exc:
        return _err("save_prediction_attempt", exc)


# ---------------------------------------------------------------------------
# Streaks
# ---------------------------------------------------------------------------

def update_streak(user_id: str, streak_state: dict) -> dict:
    """
    Upsert streak state for a user.

    Args:
        user_id:      UUID of the authenticated user.
        streak_state: Dict with keys like
                      {"current_streak", "longest_streak",
                       "last_activity_date", "streak_broken"}.

    Returns:
        Structured success / error dict.
    """
    try:
        payload = {
            "user_id": user_id,
            "updated_at": _utcnow(),
            **streak_state,
        }
        response = (
            supabase.table("streaks")
            .upsert(payload, on_conflict="user_id")
            .execute()
        )
        return _ok(response.data)
    except Exception as exc:
        return _err("update_streak", exc)


# ---------------------------------------------------------------------------
# Progress
# ---------------------------------------------------------------------------

def get_user_progress(user_id: str) -> dict:
    """
    Fetch the latest progress snapshot for a user.

    Args:
        user_id: UUID of the authenticated user.

    Returns:
        Structured success / error dict. `data` is the row or None.
    """
    try:
        response = (
            supabase.table("progress")
            .select("*")
            .eq("user_id", user_id)
            .order("updated_at", desc=True)
            .limit(1)
            .execute()
        )
        record = response.data[0] if response.data else None
        return _ok(record)
    except Exception as exc:
        return _err("get_user_progress", exc)


def update_progress(user_id: str, progress_data: dict) -> dict:
    """
    Upsert a progress snapshot for a user.

    Args:
        user_id:       UUID of the authenticated user.
        progress_data: Dict with arbitrary progress fields, e.g.
                       {"modules_completed", "quiz_avg_score",
                        "prediction_accuracy", "xp_total"}.

    Returns:
        Structured success / error dict.
    """
    try:
        payload = {
            "user_id": user_id,
            "updated_at": _utcnow(),
            **progress_data,
        }
        response = (
            supabase.table("progress")
            .upsert(payload, on_conflict="user_id")
            .execute()
        )
        return _ok(response.data)
    except Exception as exc:
        return _err("update_progress", exc)