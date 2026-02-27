"""
education_service.py

Orchestrator service layer for the Education Intelligence module.
Designed for FastAPI dependency injection.

Architecture Contract:
    - Zero business logic (delegates only to engines)
    - No FastAPI imports
    - All public methods return:
        {"status": "success", "data": {...}}
"""

from __future__ import annotations

import logging
from datetime import date
from typing import Any, Optional

from education.ai_decision_explainer import explain_ai_decision
from education.indicator_explainer import IndicatorContext, explain_indicator
from education.playground_engine import evaluate_prediction
from education.progress_tracker import UserProgressInput, compute_progress_snapshot
from education.quiz_engine import QuizQuestion, QuizResult, UserAnswer, evaluate_quiz
from education.streak_engine import (
    StreakUpdateResult,
    evaluate_streak_status,
    record_activity,
)
from education.strategy_simulator import ScenarioType, simulate_strategy

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Envelope Helper
# ---------------------------------------------------------------------------

def _ok(data: dict[str, Any]) -> dict[str, Any]:
    """Standard success envelope."""
    return {"status": "success", "data": data}


# ---------------------------------------------------------------------------
# Service Class
# ---------------------------------------------------------------------------

class EducationService:
    """
    Stateless orchestration service.

    Every public method:
        1. Accepts validated primitives
        2. Delegates to engine
        3. Wraps result in success envelope
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

        logger.info(
            "EducationService.explain_indicator | indicator=%s value=%.4f",
            indicator,
            value,
        )

        indicator_context: Optional[IndicatorContext] = None
        if context:
            indicator_context = IndicatorContext(
                timeframe=context.get("timeframe", "1D"),
                asset_class=context.get("asset_class", "equity"),
                market_regime=context.get("market_regime", "unknown"),
                extra=context.get("extra", {}),
            )

        data = explain_indicator(indicator, value, indicator_context)
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

        logger.info(
            "EducationService.explain_ai_decision | decision=%s confidence=%.3f",
            final_decision,
            confidence,
        )

        data = explain_ai_decision(
            lstm_score=lstm_score,
            cnn_score=cnn_score,
            technical_score=technical_score,
            sentiment_score=sentiment_score,
            risk_score=risk_score,
            final_decision=final_decision,
            confidence=confidence,
        )

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

        logger.info(
            "EducationService.evaluate_prediction | user=%s ai=%s actual=%s confidence=%.2f",
            user_prediction,
            ai_prediction,
            actual_outcome,
            user_confidence,
        )

        data = evaluate_prediction(
            user_prediction=user_prediction,
            user_confidence=user_confidence,
            ai_prediction=ai_prediction,
            actual_outcome=actual_outcome,
        )

        return _ok(data)

    # ------------------------------------------------------------------
    # 4. Streak Status (Read-only)
    # ------------------------------------------------------------------

    def get_streak_status(
        self,
        current_streak: int,
        max_streak: int,
        last_active_date: Optional[date],
        timezone_label: str = "UTC",
        grace_period: bool = False,
    ) -> dict[str, Any]:

        logger.debug(
            "EducationService.get_streak_status | current=%d max=%d",
            current_streak,
            max_streak,
        )

        state = evaluate_streak_status(
            current_streak=current_streak,
            max_streak=max_streak,
            last_active_date=last_active_date,
            timezone_label=timezone_label,
            grace_period=grace_period,
        )

        return _ok(state.to_dict())

    # ------------------------------------------------------------------
    # 5. Record Activity
    # ------------------------------------------------------------------

    def record_activity(
        self,
        current_streak: int,
        max_streak: int,
        last_active_date: Optional[date],
        timezone_label: str = "UTC",
        grace_period: bool = False,
    ) -> dict[str, Any]:

        logger.info(
            "EducationService.record_activity | current=%d max=%d",
            current_streak,
            max_streak,
        )

        result: StreakUpdateResult = record_activity(
            current_streak=current_streak,
            max_streak=max_streak,
            last_active_date=last_active_date,
            timezone_label=timezone_label,
            grace_period=grace_period,
        )

        return _ok(result.to_dict())

    # ------------------------------------------------------------------
    # 6. Strategy Simulator
    # ------------------------------------------------------------------

    def simulate_strategy(
        self,
        investment_amount: float,
        predicted_change_percent: float,
        risk_score: float,
        volatility_score: float,
        scenario_type: str = "NORMAL",
    ) -> dict[str, Any]:

        logger.info(
            "EducationService.simulate_strategy | investment=%.2f scenario=%s",
            investment_amount,
            scenario_type,
        )

        scenario = ScenarioType(scenario_type.upper())

        result = simulate_strategy(
            investment_amount=investment_amount,
            predicted_change_percent=predicted_change_percent,
            risk_score=risk_score,
            volatility_score=volatility_score,
            scenario_type=scenario,
        )

        return _ok(result.to_dict())

    # ------------------------------------------------------------------
    # 7. Quiz Evaluation
    # ------------------------------------------------------------------

    def evaluate_quiz(
        self,
        quiz_id: str,
        questions: list[QuizQuestion],
        user_answers: list[UserAnswer],
    ) -> dict[str, Any]:

        logger.info(
            "EducationService.evaluate_quiz | quiz_id=%s questions=%d",
            quiz_id,
            len(questions),
        )

        result: QuizResult = evaluate_quiz(
            quiz_id,
            questions,
            user_answers,
        )

        return _ok(result.to_dict())

    # ------------------------------------------------------------------
    # 8. Progress Snapshot
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

        logger.info(
            "EducationService.compute_progress_snapshot | user_id=%s",
            user_id,
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

        snapshot = compute_progress_snapshot(inp)
        return _ok(snapshot.to_dict())

    # ------------------------------------------------------------------
    # 9. Composite Education Summary
    # ------------------------------------------------------------------

    def build_full_education_summary(
        self,
        indicators: list[dict[str, Any]],
        ai_decision_payload: dict[str, Any],
        prediction_payload: dict[str, Any],
        streak_payload: dict[str, Any],
    ) -> dict[str, Any]:

        logger.info("EducationService.build_full_education_summary called.")

        return _ok({
            "indicator_explanations": indicators,
            "ai_decision_explanation": ai_decision_payload,
            "prediction_evaluation": prediction_payload,
            "streak_status": streak_payload,
        })


# ---------------------------------------------------------------------------
# FastAPI Dependency Provider (Singleton)
# ---------------------------------------------------------------------------

_service_instance: Optional[EducationService] = None


def get_education_service() -> EducationService:
    global _service_instance
    if _service_instance is None:
        _service_instance = EducationService()
        logger.info("EducationService singleton instantiated.")
    return _service_instance