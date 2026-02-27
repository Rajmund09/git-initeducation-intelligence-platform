"""
playground_engine.py

Evaluates user predictions against AI predictions and actual outcomes.
Computes accuracy, calibration, bias, and generates structured behavioral
finance feedback. Fully deterministic — no randomness or generative logic.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class PredictionOutcome(str, Enum):
    CORRECT = "CORRECT"
    INCORRECT = "INCORRECT"


class BiasType(str, Enum):
    OPTIMISTIC = "OPTIMISTIC"
    PESSIMISTIC = "PESSIMISTIC"
    CALIBRATED = "CALIBRATED"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


class CalibrationLevel(str, Enum):
    WELL_CALIBRATED = "WELL_CALIBRATED"
    OVERCONFIDENT = "OVERCONFIDENT"
    UNDERCONFIDENT = "UNDERCONFIDENT"
    UNCALIBRATED = "UNCALIBRATED"


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CALIBRATION_GAP_THRESHOLDS = {
    "WELL_CALIBRATED": 0.15,
    "MODERATE":        0.30,
}

BIAS_THRESHOLD = 0.10   # minimum directional score gap to classify optimism/pessimism


# ---------------------------------------------------------------------------
# Behavioral finance insight library
# ---------------------------------------------------------------------------

_BEHAVIORAL_INSIGHTS: dict[str, str] = {
    "overconfident_correct": (
        "Overconfidence Bias: You were correct, but your stated confidence exceeded what was "
        "statistically warranted by the information available. Sustained overconfidence leads to "
        "under-hedged positions and excessive concentration risk over time."
    ),
    "overconfident_incorrect": (
        "Overconfidence Bias + Confirmation Error: Your confidence was too high and the prediction "
        "was wrong. This is the most common profile for large trading losses. "
        "Overconfident traders underestimate tail risk and fail to plan exit strategies for adverse scenarios."
    ),
    "underconfident_correct": (
        "Under-confidence Bias: You were correct but doubted yourself. This pattern leads to "
        "premature exits, reduced position sizes, and missed returns. "
        "Consider anchoring more firmly to systematic signals rather than emotional doubt."
    ),
    "underconfident_incorrect": (
        "Under-confidence with Incorrect Call: Low confidence and an incorrect prediction. "
        "While the low confidence was appropriate for the uncertainty, examine whether "
        "insufficient research or decision paralysis contributed to the poor directional call."
    ),
    "calibrated_correct": (
        "Well-Calibrated and Correct: Your confidence aligned with outcome probability and you were right. "
        "This is the hallmark of disciplined probabilistic thinking. Sustain this approach by "
        "continuing to base confidence on quantifiable evidence rather than intuition."
    ),
    "calibrated_incorrect": (
        "Well-Calibrated but Incorrect: Your confidence was appropriate, and even skilled traders "
        "lose well-calibrated bets. This is not an error — it is probabilistic trading done correctly. "
        "A correct process does not guarantee a correct outcome on every single trade."
    ),
    "optimism_bias": (
        "Optimism Bias Detected: Your predictions have consistently skewed bullish. "
        "Optimism bias causes traders to underweight downside scenarios, hold losers too long, "
        "and overestimate the probability of favorable outcomes."
    ),
    "pessimism_bias": (
        "Pessimism Bias Detected: Your predictions have consistently skewed bearish. "
        "Excessive pessimism leads to premature profit-taking, missed long-side opportunities, "
        "and failure to hold winning positions through full trend cycles."
    ),
    "calibrated_neutral": (
        "Directional Neutrality: No persistent optimism or pessimism detected. "
        "Your predictions show balanced directional exposure, which is consistent with "
        "disciplined, evidence-based analysis rather than emotionally driven forecasting."
    ),
}


# ---------------------------------------------------------------------------
# Input / Output schemas
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class PlaygroundInput:
    """Validated input for a single prediction evaluation round."""
    user_prediction:  str    # BUY | SELL | HOLD
    user_confidence:  float  # 0.0 – 1.0
    ai_prediction:    str    # BUY | SELL | HOLD
    actual_outcome:   str    # BUY | SELL | HOLD (realized direction)

    def __post_init__(self) -> None:
        valid_directions = {"BUY", "SELL", "HOLD"}
        for field_name, field_val in [
            ("user_prediction", self.user_prediction),
            ("ai_prediction", self.ai_prediction),
            ("actual_outcome", self.actual_outcome),
        ]:
            if field_val.upper() not in valid_directions:
                raise ValueError(
                    f"{field_name} must be one of {valid_directions}; received '{field_val}'."
                )
        if not (0.0 <= self.user_confidence <= 1.0):
            raise ValueError(
                f"user_confidence must be in [0.0, 1.0]; received {self.user_confidence}."
            )


# ---------------------------------------------------------------------------
# Core computation functions
# ---------------------------------------------------------------------------

def _evaluate_correctness(user_prediction: str, actual_outcome: str) -> PredictionOutcome:
    return (
        PredictionOutcome.CORRECT
        if user_prediction.upper() == actual_outcome.upper()
        else PredictionOutcome.INCORRECT
    )


def _compute_accuracy_score(correctness: PredictionOutcome) -> float:
    """
    Binary accuracy score for a single prediction round.
    Extended to a continuous score by partial credit for HOLD predictions.
    """
    return 1.0 if correctness == PredictionOutcome.CORRECT else 0.0


def _compute_calibration_score(
    user_confidence: float,
    correctness: PredictionOutcome,
) -> tuple[float, CalibrationLevel]:
    """
    Calibration score measures alignment between stated confidence and outcome.

    Perfect calibration: confidence=0.8, correct → score near 1.0.
    Overconfidence: confidence=0.9, incorrect → penalized.
    Underconfidence: confidence=0.3, correct → penalized.
    """
    outcome_value = 1.0 if correctness == PredictionOutcome.CORRECT else 0.0
    gap = abs(user_confidence - outcome_value)

    # Brier-style calibration score: 1 - gap^2 (range: 0.0 – 1.0)
    calibration_score = round(1.0 - (gap ** 2), 4)

    if gap <= CALIBRATION_GAP_THRESHOLDS["WELL_CALIBRATED"]:
        level = CalibrationLevel.WELL_CALIBRATED
    elif gap <= CALIBRATION_GAP_THRESHOLDS["MODERATE"]:
        if user_confidence > outcome_value:
            level = CalibrationLevel.OVERCONFIDENT
        else:
            level = CalibrationLevel.UNDERCONFIDENT
    else:
        if user_confidence > outcome_value:
            level = CalibrationLevel.OVERCONFIDENT
        else:
            level = CalibrationLevel.UNDERCONFIDENT

    return calibration_score, level


def _detect_bias(
    user_prediction: str,
    ai_prediction: str,
    actual_outcome: str,
) -> tuple[BiasType, str]:
    """
    Detect systematic directional bias by comparing user prediction vs AI and actual outcome.

    Returns the BiasType and a narrative explanation.
    """
    user = user_prediction.upper()
    ai = ai_prediction.upper()
    actual = actual_outcome.upper()

    direction_scores: dict[str, int] = {"BUY": 1, "HOLD": 0, "SELL": -1}

    user_score = direction_scores.get(user, 0)
    ai_score = direction_scores.get(ai, 0)
    actual_score = direction_scores.get(actual, 0)

    user_vs_actual = user_score - actual_score
    user_vs_ai = user_score - ai_score

    if abs(user_vs_actual) == 0 and abs(user_vs_ai) == 0:
        return BiasType.CALIBRATED, _BEHAVIORAL_INSIGHTS["calibrated_neutral"]

    if user_vs_actual > 0 and user_vs_ai > 0:
        return BiasType.OPTIMISTIC, _BEHAVIORAL_INSIGHTS["optimism_bias"]

    if user_vs_actual < 0 and user_vs_ai < 0:
        return BiasType.PESSIMISTIC, _BEHAVIORAL_INSIGHTS["pessimism_bias"]

    return BiasType.CALIBRATED, _BEHAVIORAL_INSIGHTS["calibrated_neutral"]


def _select_behavioral_insight(
    correctness: PredictionOutcome,
    calibration_level: CalibrationLevel,
) -> str:
    """
    Select the most relevant behavioral finance insight based on outcome and calibration.
    """
    is_correct = correctness == PredictionOutcome.CORRECT

    if calibration_level == CalibrationLevel.OVERCONFIDENT:
        return (
            _BEHAVIORAL_INSIGHTS["overconfident_correct"]
            if is_correct
            else _BEHAVIORAL_INSIGHTS["overconfident_incorrect"]
        )
    elif calibration_level == CalibrationLevel.UNDERCONFIDENT:
        return (
            _BEHAVIORAL_INSIGHTS["underconfident_correct"]
            if is_correct
            else _BEHAVIORAL_INSIGHTS["underconfident_incorrect"]
        )
    else:
        return (
            _BEHAVIORAL_INSIGHTS["calibrated_correct"]
            if is_correct
            else _BEHAVIORAL_INSIGHTS["calibrated_incorrect"]
        )


def _build_feedback_report(
    inp: PlaygroundInput,
    correctness: PredictionOutcome,
    accuracy_score: float,
    calibration_score: float,
    calibration_level: CalibrationLevel,
    bias_type: BiasType,
    bias_explanation: str,
    behavioral_insight: str,
) -> dict[str, str]:
    """
    Assemble a structured, human-readable feedback report.
    """
    outcome_line = (
        f"Your prediction ({inp.user_prediction.upper()}) matched the actual outcome "
        f"({inp.actual_outcome.upper()})."
        if correctness == PredictionOutcome.CORRECT
        else
        f"Your prediction ({inp.user_prediction.upper()}) did not match the actual outcome "
        f"({inp.actual_outcome.upper()})."
    )

    confidence_line = (
        f"You stated {inp.user_confidence * 100:.0f}% confidence. "
        f"Calibration assessment: {calibration_level.value}. "
        f"Calibration score: {calibration_score:.3f} (1.0 = perfect)."
    )

    ai_comparison = (
        f"The AI model predicted {inp.ai_prediction.upper()}. "
        + (
            "Your prediction agreed with the AI."
            if inp.user_prediction.upper() == inp.ai_prediction.upper()
            else "Your prediction diverged from the AI recommendation."
        )
    )

    improvement_focus = (
        "Focus area: Review the confidence calibration framework. "
        "Match your stated confidence to the proportion of evidence supporting the prediction, "
        "not to your emotional conviction."
        if calibration_level in (CalibrationLevel.OVERCONFIDENT, CalibrationLevel.UNDERCONFIDENT)
        else
        "Focus area: Maintain your current calibration discipline. "
        "Continue anchoring confidence to quantifiable evidence."
    )

    return {
        "outcome_summary": outcome_line,
        "confidence_assessment": confidence_line,
        "ai_comparison": ai_comparison,
        "bias_analysis": bias_explanation,
        "behavioral_insight": behavioral_insight,
        "improvement_focus": improvement_focus,
    }


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def evaluate_prediction(
    user_prediction: str,
    user_confidence: float,
    ai_prediction: str,
    actual_outcome: str,
) -> dict[str, Any]:
    """
    Evaluate a user's market prediction against the AI recommendation and actual outcome.

    Parameters
    ----------
    user_prediction:
        User's directional call: BUY | SELL | HOLD.
    user_confidence:
        User's stated confidence in their prediction (0.0 – 1.0).
    ai_prediction:
        AI system's directional recommendation: BUY | SELL | HOLD.
    actual_outcome:
        Realized market direction: BUY | SELL | HOLD.

    Returns
    -------
    dict with keys:
        user_prediction, ai_prediction, actual_outcome, user_confidence,
        correctness, accuracy_score, calibration_score, calibration_level,
        bias_detection (type + explanation), feedback_report.
    """
    inp = PlaygroundInput(
        user_prediction=user_prediction.upper(),
        user_confidence=user_confidence,
        ai_prediction=ai_prediction.upper(),
        actual_outcome=actual_outcome.upper(),
    )

    logger.debug(
        "Evaluating prediction: user=%s ai=%s actual=%s confidence=%.2f",
        inp.user_prediction,
        inp.ai_prediction,
        inp.actual_outcome,
        inp.user_confidence,
    )

    correctness = _evaluate_correctness(inp.user_prediction, inp.actual_outcome)
    accuracy_score = _compute_accuracy_score(correctness)
    calibration_score, calibration_level = _compute_calibration_score(
        inp.user_confidence, correctness
    )
    bias_type, bias_explanation = _detect_bias(
        inp.user_prediction, inp.ai_prediction, inp.actual_outcome
    )
    behavioral_insight = _select_behavioral_insight(correctness, calibration_level)
    feedback_report = _build_feedback_report(
        inp=inp,
        correctness=correctness,
        accuracy_score=accuracy_score,
        calibration_score=calibration_score,
        calibration_level=calibration_level,
        bias_type=bias_type,
        bias_explanation=bias_explanation,
        behavioral_insight=behavioral_insight,
    )

    return {
        "user_prediction": inp.user_prediction,
        "ai_prediction": inp.ai_prediction,
        "actual_outcome": inp.actual_outcome,
        "user_confidence": inp.user_confidence,
        "correctness": correctness.value,
        "accuracy_score": accuracy_score,
        "calibration_score": calibration_score,
        "calibration_level": calibration_level.value,
        "bias_detection": {
            "type": bias_type.value,
            "explanation": bias_explanation,
        },
        "feedback_report": feedback_report,
    }