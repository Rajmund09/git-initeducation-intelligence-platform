"""
education_routes.py

FastAPI router for the Education Intelligence API.

Architecture contract:
    - Routes contain ZERO business logic and ZERO persistence logic.
    - Every endpoint delegates exclusively to EducationService via Depends().
    - Pydantic schemas handle all input validation before the service is invoked.
    - Service responses arrive as {"status": "success", "data": {...}} envelopes.
    - Routes unwrap the envelope and construct the typed response model.
    - All exceptions are caught and re-raised as structured HTTPExceptions.

Route map:
    POST /education/indicator/explain    → EducationService.explain_indicator
    POST /education/ai-decision/explain  → EducationService.explain_ai_decision
    POST /education/playground/evaluate  → EducationService.evaluate_prediction
    POST /education/strategy/simulate    → EducationService.simulate_strategy
    POST /education/quiz/submit          → EducationService.evaluate_quiz
    POST /education/streak/status        → EducationService.get_streak_status | record_activity
    POST /education/progress/snapshot    → EducationService.compute_progress_snapshot
    GET  /education/progress/{user_id}   → EducationService.get_progress
"""

from __future__ import annotations

import logging
from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from education.education_service import EducationService, get_education_service
from education.quiz_engine import DifficultyLevel, QuizQuestion, TopicTag, UserAnswer
from education_app.schemas import (
    AIDecisionExplainRequest,
    AIDecisionExplainResponse,
    IndicatorExplainRequest,
    IndicatorExplainResponse,
    PredictionPlaygroundRequest,
    PredictionPlaygroundResponse,
    ProgressSnapshotRequest,
    ProgressSnapshotResponse,
    QuizSubmissionRequest,
    QuizSubmissionResponse,
    StrategySimulationRequest,
    StrategySimulationResponse,
    StreakStatusRequest,
    StreakStatusResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/education",
    tags=["Education Intelligence"],
    responses={
        422: {"description": "Validation error — request body failed schema constraints."},
        500: {"description": "Internal server error — engine raised an unexpected exception."},
    },
)


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _unwrap(envelope: dict[str, Any], endpoint: str) -> dict[str, Any]:
    """
    Unwrap the standard service envelope {"status": "success", "data": {...}}.

    Raises HTTP 500 if the envelope is malformed or status is not "success".

    Parameters
    ----------
    envelope:
        Raw dict returned by any EducationService method.
    endpoint:
        Calling endpoint label for structured error reporting.

    Returns
    -------
    dict
        The inner "data" payload.
    """
    if not isinstance(envelope, dict) or envelope.get("status") != "success":
        logger.error(
            "Malformed service envelope at %s | envelope=%s", endpoint, envelope
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "endpoint": endpoint,
                "error":    "MalformedEnvelope",
                "message":  "Service returned an unexpected response structure.",
            },
        )
    data = envelope.get("data")
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "endpoint": endpoint,
                "error":    "EmptyData",
                "message":  "Service envelope contained no data payload.",
            },
        )
    return data


def _parse_date(date_str: str | None, endpoint: str) -> date | None:
    """
    Parse an ISO-8601 date string to a date object, or return None.

    Raises HTTP 422 on invalid format.
    """
    if date_str is None:
        return None
    try:
        return date.fromisoformat(date_str)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "endpoint": endpoint,
                "error":    "InvalidDateFormat",
                "message":  f"'{date_str}' is not a valid ISO-8601 date. Expected YYYY-MM-DD.",
            },
        ) from exc


def _http_422(endpoint: str, exc: Exception) -> HTTPException:
    """Construct a standardised 422 HTTPException from a domain validation error."""
    logger.warning("Validation error | %s | %s: %s", endpoint, type(exc).__name__, exc)
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail={
            "endpoint": endpoint,
            "error":    "ValidationError",
            "message":  str(exc),
        },
    )


def _http_500(endpoint: str, exc: Exception) -> HTTPException:
    """Construct a standardised 500 HTTPException from an unhandled engine exception."""
    logger.exception("Unhandled exception | %s | %s: %s", endpoint, type(exc).__name__, exc)
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail={
            "endpoint": endpoint,
            "error":    type(exc).__name__,
            "message":  str(exc),
        },
    )


def _build_quiz_question(q: Any) -> QuizQuestion:
    """
    Convert a QuizQuestionSchema Pydantic model into a QuizQuestion domain object.

    Invalid topic or difficulty values fall back to safe defaults rather than
    raising an exception, so a single malformed question does not abort the session.
    """
    try:
        topic = TopicTag(q.topic.upper())
    except ValueError:
        logger.warning("Unknown topic tag '%s'; defaulting to GENERAL.", q.topic)
        topic = TopicTag.GENERAL

    try:
        difficulty = DifficultyLevel(q.difficulty.upper())
    except ValueError:
        logger.warning("Unknown difficulty '%s'; defaulting to MEDIUM.", q.difficulty)
        difficulty = DifficultyLevel.MEDIUM

    return QuizQuestion(
        question_id=q.question_id,
        question_text=q.question_text,
        options=tuple(q.options),
        correct_option_key=q.correct_option_key.upper(),
        topic=topic,
        difficulty=difficulty,
        explanation=q.explanation,
    )


# ---------------------------------------------------------------------------
# 1. Indicator Explainer
# ---------------------------------------------------------------------------

@router.post(
    "/indicator/explain",
    response_model=IndicatorExplainResponse,
    status_code=status.HTTP_200_OK,
    summary="Explain a technical indicator",
)
async def explain_indicator(
    request: IndicatorExplainRequest,
    service: EducationService = Depends(get_education_service),
) -> IndicatorExplainResponse:

    endpoint = "POST /education/indicator/explain"

    context_dict = None
    if request.context:
        context_dict = {
            "timeframe": request.context.timeframe,
            "asset_class": request.context.asset_class,
            "market_regime": request.context.market_regime,
            "extra": request.context.extra,
        }

    try:
        envelope = service.explain_indicator(
            indicator=request.indicator,
            value=request.value,
            context=context_dict,
        )
    except ValueError as exc:
        raise _http_422(endpoint, exc) from exc
    except Exception as exc:
        raise _http_500(endpoint, exc) from exc

    return IndicatorExplainResponse(**_unwrap(envelope, endpoint))

# ---------------------------------------------------------------------------
# 2. AI Decision Explainer
# ---------------------------------------------------------------------------

@router.post(
    "/ai-decision/explain",
    response_model=AIDecisionExplainResponse,
    status_code=status.HTTP_200_OK,
    summary="Explain an AI ensemble decision",
    response_description="Weighted contributions, reasoning points, and reliability classification.",
)
async def explain_ai_decision(
    request: AIDecisionExplainRequest,
    service: EducationService = Depends(get_education_service),
) -> AIDecisionExplainResponse:
    """
    Produce a structured explanation for an AI ensemble model decision.

    Accepts scores from five model components — LSTM, CNN, Technical, Sentiment, Risk —
    plus the final ensemble decision. Returns:

    - **weighted_contributions** — per-model raw score, assigned weight, and weighted contribution.
    - **reasoning_points** — ordered list of fact-derived rationale statements.
    - **agreement_level** — proportion of directional models aligned with the decision.
    - **risk_adjustment_explanation** — narrative describing the risk model's confidence impact.
    - **explanation_strength** — overall decision reliability: STRONG | MODERATE | WEAK | UNRELIABLE.
    """
    endpoint = "POST /education/ai-decision/explain"
    logger.info(
        "%s | decision=%s confidence=%.3f",
        endpoint, request.final_decision, request.confidence,
    )

    try:
        envelope = service.explain_ai_decision(
            lstm_score=request.lstm_score,
            cnn_score=request.cnn_score,
            technical_score=request.technical_score,
            sentiment_score=request.sentiment_score,
            risk_score=request.risk_score,
            final_decision=request.final_decision,
            confidence=request.confidence,
        )
    except ValueError as exc:
        raise _http_422(endpoint, exc) from exc
    except Exception as exc:
        raise _http_500(endpoint, exc) from exc

    return AIDecisionExplainResponse(**_unwrap(envelope, endpoint))


# ---------------------------------------------------------------------------
# 3. Prediction Playground
# ---------------------------------------------------------------------------

@router.post(
    "/playground/evaluate",
    response_model=PredictionPlaygroundResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate a user market prediction",
    response_description="Accuracy, calibration score, bias detection, and behavioral finance feedback.",
)
async def evaluate_prediction(
    request: PredictionPlaygroundRequest,
    service: EducationService = Depends(get_education_service),
) -> PredictionPlaygroundResponse:
    """
    Evaluate a user's market prediction against the AI recommendation and actual outcome.

    Computes:
    - **correctness** — whether the user's call matched the actual outcome.
    - **accuracy_score** — binary accuracy for this prediction round.
    - **calibration_score** — Brier-style score; 1.0 = perfectly calibrated.
    - **calibration_level** — WELL_CALIBRATED | OVERCONFIDENT | UNDERCONFIDENT | UNCALIBRATED.
    - **bias_detection** — systematic optimism or pessimism classification.
    - **feedback_report** — structured behavioral finance coaching feedback.
    """
    endpoint = "POST /education/playground/evaluate"
    logger.info(
        "%s | user=%s ai=%s actual=%s confidence=%.2f",
        endpoint,
        request.user_prediction,
        request.ai_prediction,
        request.actual_outcome,
        request.user_confidence,
    )

    try:
        envelope = service.evaluate_prediction(
            user_prediction=request.user_prediction,
            user_confidence=request.user_confidence,
            ai_prediction=request.ai_prediction,
            actual_outcome=request.actual_outcome,
        )
    except ValueError as exc:
        raise _http_422(endpoint, exc) from exc
    except Exception as exc:
        raise _http_500(endpoint, exc) from exc

    return PredictionPlaygroundResponse(**_unwrap(envelope, endpoint))


# ---------------------------------------------------------------------------
# 4. Strategy Simulator
# ---------------------------------------------------------------------------

@router.post(
    "/strategy/simulate",
    response_model=StrategySimulationResponse,
    status_code=status.HTTP_200_OK,
    summary="Simulate investment strategy outcomes",
    response_description="Projected value, risk-adjusted value, worst case, and educational insight.",
)
async def simulate_strategy(
    request: StrategySimulationRequest,
    service: EducationService = Depends(get_education_service),
) -> StrategySimulationResponse:
    """
    Run a deterministic investment strategy simulation under a specified market scenario.

    **Scenarios:**
    - `NORMAL` — standard variance drag applied to the base projection.
    - `MARKET_CRASH` — 35% systemic shock stacked on top of risk and volatility penalties.
    - `HIGH_VOLATILITY` — elevated variance drag coefficient (18%) applied.

    Returns projected value, risk-adjusted value, worst-case capital floor,
    volatility impact in currency units, and an educational financial insight.
    """
    endpoint = "POST /education/strategy/simulate"
    logger.info(
        "%s | investment=%.2f change=%.2f%% scenario=%s",
        endpoint,
        request.investment_amount,
        request.predicted_change_percent,
        request.scenario_type,
    )

    try:
        envelope = service.simulate_strategy(
            investment_amount=request.investment_amount,
            predicted_change_percent=request.predicted_change_percent,
            risk_score=request.risk_score,
            volatility_score=request.volatility_score,
            scenario_type=request.scenario_type,
        )
    except ValueError as exc:
        raise _http_422(endpoint, exc) from exc
    except Exception as exc:
        raise _http_500(endpoint, exc) from exc

    return StrategySimulationResponse(**_unwrap(envelope, endpoint))


# ---------------------------------------------------------------------------
# 5. Quiz Submission
# ---------------------------------------------------------------------------

@router.post(
    "/quiz/submit",
    response_model=QuizSubmissionResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit and evaluate a quiz session",
    response_description="Score, mastery level, topic breakdown, and learning recommendations.",
)
async def submit_quiz(
    request: QuizSubmissionRequest,
    service: EducationService = Depends(get_education_service),
) -> QuizSubmissionResponse:
    """
    Evaluate a completed quiz session and return a structured learning result.

    The route converts Pydantic schema models into engine domain objects before
    delegating to the service. This is the only place where schema-to-domain
    conversion occurs; the service and engines are schema-unaware.

    Computes:
    - **score_percentage** and **points_earned** for this session.
    - **mastery_level** — BEGINNER | INTERMEDIATE | ADVANCED.
    - **topic_performance** — per-topic accuracy with STRONG / DEVELOPING / WEAK bands.
    - **question_results** — per-question correctness and educational explanation.
    - **learning_recommendations** — targeted study focus areas based on weak topics.
    - **motivational_feedback** — mastery-level-aligned encouragement.
    """
    endpoint = "POST /education/quiz/submit"
    logger.info(
        "%s | quiz_id=%s questions=%d answers=%d",
        endpoint, request.quiz_id, len(request.questions), len(request.user_answers),
    )

    try:
        domain_questions = [_build_quiz_question(q) for q in request.questions]
        domain_answers = [
            UserAnswer(
                question_id=a.question_id,
                selected_key=a.selected_key.upper(),
                time_taken_sec=a.time_taken_sec,
            )
            for a in request.user_answers
        ]
        envelope = service.evaluate_quiz(
            quiz_id=request.quiz_id,
            questions=domain_questions,
            user_answers=domain_answers,
        )
    except ValueError as exc:
        raise _http_422(endpoint, exc) from exc
    except Exception as exc:
        raise _http_500(endpoint, exc) from exc

    return QuizSubmissionResponse(**_unwrap(envelope, endpoint))


# ---------------------------------------------------------------------------
# 6. Streak Status
# ---------------------------------------------------------------------------

@router.post(
    "/streak/status",
    response_model=StreakStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate or record a learning streak",
    response_description="Current streak state or update result with transition flags.",
)
async def streak_status(
    request: StreakStatusRequest,
    service: EducationService = Depends(get_education_service),
) -> StreakStatusResponse:
    """
    Evaluate the current streak status or record a new learning activity event.

    **Modes controlled by `record_activity` flag:**
    - `false` (default) — read-only status check. Returns `current_state` only.
    - `true` — records activity. Returns `previous_state`, `updated_state`,
      `streak_extended`, `streak_reset`, and `is_new_record`.

    **Grace period:** one missed day is forgiven when `grace_period=true`.

    Dates must be ISO-8601 strings (`YYYY-MM-DD`).
    Timezone must be a valid IANA string (e.g. `Asia/Kolkata`, `America/New_York`).
    """
    endpoint = "POST /education/streak/status"
    logger.info(
        "%s | current=%d max=%d tz=%s record=%s",
        endpoint,
        request.current_streak,
        request.max_streak,
        request.timezone_label,
        request.record_activity,
    )

    last_active = _parse_date(request.last_active_date, endpoint)

    try:
        if request.record_activity:
            envelope = service.record_activity(
                current_streak=request.current_streak,
                max_streak=request.max_streak,
                last_active_date=last_active,
                timezone_label=request.timezone_label,
                grace_period=request.grace_period,
            )
            data = _unwrap(envelope, endpoint)
            return StreakStatusResponse(
                previous_state=data.get("previous_state"),
                updated_state=data.get("updated_state"),
                streak_extended=data.get("streak_extended"),
                streak_reset=data.get("streak_reset"),
                is_new_record=data.get("is_new_record"),
            )
        else:
            envelope = service.get_streak_status(
                current_streak=request.current_streak,
                max_streak=request.max_streak,
                last_active_date=last_active,
                timezone_label=request.timezone_label,
                grace_period=request.grace_period,
            )
            data = _unwrap(envelope, endpoint)
            return StreakStatusResponse(current_state=data)

    except HTTPException:
        raise
    except ValueError as exc:
        raise _http_422(endpoint, exc) from exc
    except Exception as exc:
        raise _http_500(endpoint, exc) from exc


# ---------------------------------------------------------------------------
# 7. Progress Snapshot — Compute
# ---------------------------------------------------------------------------

@router.post(
    "/progress/snapshot",
    response_model=ProgressSnapshotResponse,
    status_code=status.HTTP_200_OK,
    summary="Compute a full user learning progress snapshot",
    response_description="Points, level, badges, engagement score, and skill maturity.",
)
async def progress_snapshot(
    request: ProgressSnapshotRequest,
    service: EducationService = Depends(get_education_service),
) -> ProgressSnapshotResponse:
    """
    Compute a complete gamified user learning progress snapshot from lifetime history.

    **Points system:**
    - Quiz completion → +10 pts per quiz
    - Correct prediction → +15 pts each
    - Streak milestone 7 / 30 / 90 days → +25 / +75 / +200 pts
    - High-calibration prediction (≥ 0.80) → +20 pts each

    **Badges awarded:**
    - Bronze / Silver / Gold Streak — 7 / 30 / 90 consecutive day milestones
    - Scholar — 90%+ quiz average across ≥ 5 quizzes
    - Precision Trader — ≥ 0.85 average calibration across ≥ 10 predictions

    **Derived metrics:**
    - `engagement_score` — weighted composite (quiz + prediction + streak + calibration).
    - `learning_consistency` — HIGH | MEDIUM | LOW based on activity breadth and recency.
    - `skill_maturity` — DEVELOPING | COMPETENT | PROFICIENT | EXPERT.
    """
    endpoint = "POST /education/progress/snapshot"
    logger.info(
        "%s | user_id=%s total_points=%d streak=%d",
        endpoint, request.user_id, request.total_points, request.current_streak,
    )

    try:
        envelope = service.compute_progress_snapshot(
            user_id=request.user_id,
            quizzes_completed=request.quizzes_completed,
            quiz_scores=request.quiz_scores,
            predictions_made=request.predictions_made,
            correct_predictions=request.correct_predictions,
            calibration_scores=request.calibration_scores,
            current_streak=request.current_streak,
            max_streak_achieved=request.max_streak_achieved,
            total_points=request.total_points,
            existing_badge_ids=request.existing_badge_ids,
        )
    except ValueError as exc:
        raise _http_422(endpoint, exc) from exc
    except Exception as exc:
        raise _http_500(endpoint, exc) from exc

    return ProgressSnapshotResponse(**_unwrap(envelope, endpoint))


# ---------------------------------------------------------------------------
# 8. Progress — Retrieve persisted record
# ---------------------------------------------------------------------------

@router.get(
    "/progress/{user_id}",
    status_code=status.HTTP_200_OK,
    summary="Retrieve a persisted user progress record",
    response_description="Most recent Supabase-persisted progress snapshot for the user.",
)
async def get_progress(
    user_id: str,
    service: EducationService = Depends(get_education_service),
) -> dict[str, Any]:
    """
    Retrieve the most recently persisted progress snapshot for a given user from Supabase.

    Returns a raw dict rather than a typed response model because the persisted row
    schema is DB-column-driven and may evolve independently of the Pydantic models.

    Responds with HTTP 200 in all cases — missing records are represented by
    `record: null` with an explanatory message, never by a 404 error. This prevents
    client-side error handling for the common case of new users with no history.
    """
    endpoint = f"GET /education/progress/{user_id}"
    logger.info("%s", endpoint)

    try:
        envelope = service.get_progress(user_id=user_id)
    except Exception as exc:
        raise _http_500(endpoint, exc) from exc

    return _unwrap(envelope, endpoint)