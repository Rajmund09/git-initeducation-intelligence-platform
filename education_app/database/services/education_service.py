"""
education_service.py

Orchestration layer for the Education Intelligence module.

Responsibilities:
    - Accept primitive inputs from the API route layer.
    - Delegate computation exclusively to engine modules.
    - Persist results to Supabase (non-blocking; failures are logged, never raised).
    - Return standardised response envelopes: {"status": "success", "data": {...}}.

Architecture invariants:
    - Zero business logic. Logic lives in engines only.
    - Zero FastAPI imports. Service is framework-agnostic.
    - All public methods return dict[str, Any] with the envelope schema.
    - Every method is individually exception-safe.
"""

from __future__ import annotations

import logging
from datetime import date
from typing import Any, Optional

from education.ai_decision_explainer import explain_ai_decision as _engine_explain_ai_decision
from education.indicator_explainer import IndicatorContext, explain_indicator as _engine_explain_indicator
from education.playground_engine import evaluate_prediction as _engine_evaluate_prediction
from education.progress_tracker import UserProgressInput, compute_progress_snapshot as _engine_compute_progress
from education.quiz_engine import QuizQuestion, QuizResult, UserAnswer, evaluate_quiz as _engine_evaluate_quiz
from education.streak_engine import (
    StreakUpdateResult,
    evaluate_streak_status as _engine_evaluate_streak,
    record_activity as _engine_record_activity,
)
from education.strategy_simulator import ScenarioType, simulate_strategy as _engine_simulate_strategy

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Supabase client — imported defensively so the service runs without DB
# ---------------------------------------------------------------------------

try:
    from supabase import Client as SupabaseClient
    from database.supabase_client import get_supabase_client
    _SUPABASE_AVAILABLE = True
except ImportError:
    _SUPABASE_AVAILABLE = False
    logger.warning(
        "supabase_client not available. Persistence will be skipped for all service calls."
    )


# ---------------------------------------------------------------------------
# Envelope helpers
# ---------------------------------------------------------------------------
def _success(data: dict[str, Any]) -> dict[str, Any]:
    return {
        "success": True,
        "data": data
    }
def _ok(data: dict[str, Any]) -> dict[str, Any]:
    """Wrap a data payload in the standard success envelope."""
    return {"status": "success", "data": data}


def _persist(table: str, payload: dict[str, Any]) -> None:
    """
    Persist a payload to a Supabase table.

    Non-blocking: any exception is logged as a warning and silently swallowed.
    A persistence failure must never propagate to the caller or degrade the response.

    Parameters
    ----------
    table:
        Target Supabase table name.
    payload:
        Dict of column/value pairs to upsert.
    """
    if not _SUPABASE_AVAILABLE:
        return
    try:
        client: SupabaseClient = get_supabase_client()
        client.table(table).upsert(payload).execute()
        logger.debug("Persisted to table='%s' keys=%s", table, list(payload.keys()))
    except Exception as exc:
        logger.warning(
            "Non-blocking persistence failure | table='%s' error=%s: %s",
            table,
            type(exc).__name__,
            exc,
        )


# ---------------------------------------------------------------------------
# Service class
# ---------------------------------------------------------------------------

class EducationService:
    """
    Stateless orchestration service for the Education Intelligence layer.

    All public methods follow a strict three-step contract:
        1. Build domain objects from primitive inputs.
        2. Delegate to the relevant engine function.
        3. Persist results to Supabase (non-blocking).
        4. Return a standardised envelope: {"status": "success", "data": {...}}.

    No caching. No mutable state. No business logic.
    """

    # ------------------------------------------------------------------
    # 1. Indicator Explainer
    # ------------------------------------------------------------------

    def explain_indicator(
        self,
        indicator: str,
        value: float,
        context: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """
        Explain a technical indicator using deterministic rule-based logic.

        Parameters
        ----------
        indicator:
            Indicator name: RSI | EMA | SMA | Volume | Volatility.
        value:
            Current numeric value of the indicator.
        context:
            Optional dict with keys: timeframe, asset_class, market_regime, extra (dict).

        Returns
        -------
        dict
            Envelope wrapping IndicatorExplanation fields.
        """
        logger.info(
            "EducationService.explain_indicator | indicator=%s value=%.4f",
            indicator, value,
        )

        indicator_context: Optional[IndicatorContext] = None
        if context:
            indicator_context = IndicatorContext(
                timeframe=context.get("timeframe", "1D"),
                asset_class=context.get("asset_class", "equity"),
                market_regime=context.get("market_regime", "unknown"),
                extra=context.get("extra", {}),
            )

        data = _engine_explain_indicator(indicator, value, indicator_context)

        _persist("education_indicator_explanations", {
            "indicator_name": data.get("indicator_name"),
            "value":          data.get("value"),
            "market_signal":  data.get("market_signal"),
            "trading_bias":   data.get("trading_bias"),
        })

        return _ok(data)

    # ------------------------------------------------------------------
    # 2. AI Decision Explainer
    # ------------------------------------------------------------------

    def explain_ai_decision(
        self,
        lstm_score: float,
        cnn_score: float,
        technical_score: float,
        sentiment_score: float,
        risk_score: float,
        final_decision: str,
        confidence: float,
    ) -> dict[str, Any]:
        """
        Explain an AI ensemble decision with weighted contributions and agreement analysis.

        All score parameters must be in [0.0, 1.0].
        final_decision must be BUY | SELL | HOLD.

        Returns
        -------
        dict
            Envelope wrapping AIDecisionExplanation fields.
        """
        logger.info(
            "EducationService.explain_ai_decision | decision=%s confidence=%.3f",
            final_decision, confidence,
        )

        data = _engine_explain_ai_decision(
            lstm_score=lstm_score,
            cnn_score=cnn_score,
            technical_score=technical_score,
            sentiment_score=sentiment_score,
            risk_score=risk_score,
            final_decision=final_decision,
            confidence=confidence,
        )

        _persist("education_ai_decisions", {
            "final_decision":       data.get("final_decision"),
            "confidence":           data.get("confidence"),
            "agreement_level":      data.get("agreement_level"),
            "explanation_strength": data.get("explanation_strength"),
        })

        return _ok(data)

    # ------------------------------------------------------------------
    # 3. Prediction Playground
    # ------------------------------------------------------------------

    def evaluate_prediction(
        self,
        user_prediction: str,
        user_confidence: float,
        ai_prediction: str,
        actual_outcome: str,
    ) -> dict[str, Any]:
        """
        Evaluate a user's market prediction against the AI recommendation and actual outcome.

        Returns accuracy, Brier-style calibration score, bias classification,
        and structured behavioral finance feedback.

        Returns
        -------
        dict
            Envelope wrapping PlaygroundEvaluation fields.
        """
        logger.info(
            "EducationService.evaluate_prediction | user=%s ai=%s actual=%s confidence=%.2f",
            user_prediction, ai_prediction, actual_outcome, user_confidence,
        )

        data = _engine_evaluate_prediction(
            user_prediction=user_prediction,
            user_confidence=user_confidence,
            ai_prediction=ai_prediction,
            actual_outcome=actual_outcome,
        )

        _persist("education_predictions", {
            "user_prediction":   data.get("user_prediction"),
            "ai_prediction":     data.get("ai_prediction"),
            "actual_outcome":    data.get("actual_outcome"),
            "correctness":       data.get("correctness"),
            "calibration_score": data.get("calibration_score"),
            "calibration_level": data.get("calibration_level"),
        })

        return _ok(data)

    # ------------------------------------------------------------------
    # 4. Strategy Simulator
    # ------------------------------------------------------------------

    def simulate_strategy(
        self,
        investment_amount: float,
        predicted_change_percent: float,
        risk_score: float,
        volatility_score: float,
        scenario_type: str = "NORMAL",
    ) -> dict[str, Any]:
        """
        Simulate projected investment outcomes under a specified market scenario.

        Parameters
        ----------
        scenario_type:
            NORMAL | MARKET_CRASH | HIGH_VOLATILITY.

        Returns
        -------
        dict
            Envelope wrapping StrategySimulationResult fields.

        Raises
        ------
        ValueError
            If scenario_type is not a recognised ScenarioType value.
        """
        logger.info(
            "EducationService.simulate_strategy | investment=%.2f scenario=%s",
            investment_amount, scenario_type,
        )

        scenario = ScenarioType(scenario_type.upper())
        result = _engine_simulate_strategy(
            investment_amount=investment_amount,
            predicted_change_percent=predicted_change_percent,
            risk_score=risk_score,
            volatility_score=volatility_score,
            scenario_type=scenario,
        )
        data = result.to_dict()

        _persist("education_strategy_simulations", {
            "initial_investment":    data.get("initial_investment"),
            "projected_value":       data.get("projected_value"),
            "projected_profit_loss": data.get("projected_profit_loss"),
            "scenario_applied":      data.get("scenario_applied"),
        })

        return _ok(data)

    # ------------------------------------------------------------------
    # 5. Quiz Evaluation
    # ------------------------------------------------------------------

    def evaluate_quiz(
        self,
        quiz_id: str,
        questions: list[QuizQuestion],
        user_answers: list[UserAnswer],
    ) -> dict[str, Any]:
        """
        Evaluate a completed quiz session and return structured learning results.

        Parameters
        ----------
        quiz_id:
            Unique session identifier (UUID recommended).
        questions:
            Ordered list of QuizQuestion domain objects for this session.
        user_answers:
            List of UserAnswer domain objects submitted by the user.

        Returns
        -------
        dict
            Envelope wrapping QuizResult fields including mastery level,
            topic breakdown, and learning recommendations.
        """
        logger.info(
            "EducationService.evaluate_quiz | quiz_id=%s questions=%d answers=%d",
            quiz_id, len(questions), len(user_answers),
        )

        result: QuizResult = _engine_evaluate_quiz(quiz_id, questions, user_answers)
        data = result.to_dict()

        _persist("education_quiz_results", {
            "quiz_id":          data.get("quiz_id"),
            "score_percentage": data.get("score_percentage"),
            "mastery_level":    data.get("mastery_level"),
            "correct_count":    data.get("correct_count"),
            "points_earned":    data.get("points_earned"),
        })

        return _ok(data)

    # ------------------------------------------------------------------
    # 6. Streak — Read-only status
    # ------------------------------------------------------------------

    def get_streak_status(
        self,
        current_streak: int,
        max_streak: int,
        last_active_date: Optional[date],
        timezone_label: str = "UTC",
        grace_period: bool = False,
    ) -> dict[str, Any]:
        """
        Return the current streak status without recording a new activity event.

        Suitable for dashboard read operations and streak display rendering.

        Returns
        -------
        dict
            Envelope wrapping StreakState fields.
        """
        logger.debug(
            "EducationService.get_streak_status | current=%d max=%d tz=%s",
            current_streak, max_streak, timezone_label,
        )

        state = _engine_evaluate_streak(
            current_streak=current_streak,
            max_streak=max_streak,
            last_active_date=last_active_date,
            timezone_label=timezone_label,
            grace_period=grace_period,
        )
        return _ok(state.to_dict())

    # ------------------------------------------------------------------
    # 7. Streak — Record activity
    # ------------------------------------------------------------------

    def record_activity(
        self,
        current_streak: int,
        max_streak: int,
        last_active_date: Optional[date],
        timezone_label: str = "UTC",
        grace_period: bool = False,
    ) -> dict[str, Any]:
        """
        Record a learning activity event and return the updated streak result.

        Idempotent for same-day calls: repeated calls within one calendar day
        will not increment the streak beyond once.

        Returns
        -------
        dict
            Envelope wrapping StreakUpdateResult fields including previous_state,
            updated_state, streak_extended, streak_reset, and is_new_record.
        """
        logger.info(
            "EducationService.record_activity | current=%d max=%d tz=%s grace=%s",
            current_streak, max_streak, timezone_label, grace_period,
        )

        result: StreakUpdateResult = _engine_record_activity(
            current_streak=current_streak,
            max_streak=max_streak,
            last_active_date=last_active_date,
            timezone_label=timezone_label,
            grace_period=grace_period,
        )
        data = result.to_dict()

        updated: dict[str, Any] = data.get("updated_state") or {}
        _persist("education_streaks", {
            "current_streak":  updated.get("current_streak"),
            "max_streak":      updated.get("max_streak"),
            "streak_extended": data.get("streak_extended"),
            "streak_reset":    data.get("streak_reset"),
            "is_new_record":   data.get("is_new_record"),
        })

        return _ok(data)

    # ------------------------------------------------------------------
    # 8. Progress Snapshot — Compute from full history
    # ------------------------------------------------------------------

    def compute_progress_snapshot(
        self,
        user_id: str,
        quizzes_completed: int,
        quiz_scores: list[float],
        predictions_made: int,
        correct_predictions: int,
        calibration_scores: list[float],
        current_streak: int,
        max_streak_achieved: int,
        total_points: int,
        existing_badge_ids: Optional[list[str]] = None,
    ) -> dict[str, Any]:
        """
        Compute a complete gamified user progress snapshot from accumulated history.

        Derives: total points, level, badges, engagement score, learning consistency,
        and skill maturity classification.

        Returns
        -------
        dict
            Envelope wrapping UserProgressSnapshot fields.
        """
        logger.info(
            "EducationService.compute_progress_snapshot | user_id=%s points=%d streak=%d",
            user_id, total_points, current_streak,
        )

        inp = UserProgressInput(
            user_id=user_id,
            quizzes_completed=quizzes_completed,
            quiz_scores=tuple(quiz_scores),
            predictions_made=predictions_made,
            correct_predictions=correct_predictions,
            calibration_scores=tuple(calibration_scores),
            current_streak=current_streak,
            max_streak_achieved=max_streak_achieved,
            total_points=total_points,
            existing_badge_ids=frozenset(existing_badge_ids or []),
        )
        snapshot = _engine_compute_progress(inp)
        data = snapshot.to_dict()

        _persist("education_progress_snapshots", {
            "user_id":              data.get("user_id"),
            "total_points":         data.get("total_points"),
            "level":                data.get("level"),
            "skill_maturity":       data.get("skill_maturity"),
            "engagement_score":     data.get("engagement_score"),
            "learning_consistency": data.get("learning_consistency"),
            "badge_count":          len(data.get("badges", [])),
        })

        return _ok(data)

    # ------------------------------------------------------------------
    # 9. Progress — Retrieve persisted record
    # ------------------------------------------------------------------

    def get_progress(self, user_id: str) -> dict[str, Any]:
        """
        Retrieve the most recently persisted progress snapshot for a user from Supabase.

        Falls back gracefully when Supabase is unavailable or the user has no record.

        Parameters
        ----------
        user_id:
            Unique user identifier.

        Returns
        -------
        dict
            Envelope wrapping the persisted snapshot row, or a safe fallback payload.
        """
        logger.info("EducationService.get_progress | user_id=%s", user_id)

        if not _SUPABASE_AVAILABLE:
            logger.warning(
                "EducationService.get_progress | Supabase unavailable for user_id=%s", user_id
            )
            return _ok({
                "user_id": user_id,
                "record":  None,
                "message": "Persistence layer unavailable.",
            })

        try:
            client = get_supabase_client()
            response = (
                client.table("education_progress_snapshots")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            records: list[dict[str, Any]] = response.data or []
            if not records:
                return _ok({
                    "user_id": user_id,
                    "record":  None,
                    "message": "No progress record found.",
                })
            return _ok({"user_id": user_id, "record": records[0]})
        except Exception as exc:
            logger.warning(
                "EducationService.get_progress | DB read failed for user_id=%s: %s",
                user_id, exc,
            )
            return _ok({
                "user_id": user_id,
                "record":  None,
                "message": "Progress record temporarily unavailable.",
            })

    # ------------------------------------------------------------------
    # 10. Full Education Summary — Composite assembly
    # ------------------------------------------------------------------

    def build_full_education_summary(
        self,
        indicators: list[dict[str, Any]],
        ai_decision_payload: dict[str, Any],
        prediction_payload: dict[str, Any],
        streak_payload: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Assemble pre-computed engine payloads into a unified post-trade education summary.

        This method performs no computation. It is an assembly operation only,
        combining outputs from multiple service calls into a single response envelope
        suitable for rendering a complete learning report.

        Returns
        -------
        dict
            Envelope wrapping the unified summary payload.
        """
        logger.info("EducationService.build_full_education_summary | assembling composite payload.")
        return _ok({
            "indicator_explanations": indicators,
            "ai_decision_explanation": ai_decision_payload,
            "prediction_evaluation":   prediction_payload,
            "streak_status":           streak_payload,
        })


# ---------------------------------------------------------------------------
# FastAPI dependency provider — module-level singleton
# ---------------------------------------------------------------------------

_service_instance: Optional[EducationService] = None


def get_education_service() -> EducationService:
    """
    FastAPI-compatible dependency provider returning a module-level singleton.

    The singleton is lazily instantiated on first call and reused for the
    lifetime of the process. Thread-safe for read-only service methods.

    Usage:
        from fastapi import Depends
        from education.education_service import get_education_service

        service: EducationService = Depends(get_education_service)
    """
    global _service_instance
    if _service_instance is None:
        _service_instance = EducationService()
        logger.info("EducationService singleton instantiated.")
    return _service_instance