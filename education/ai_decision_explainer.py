"""
ai_decision_explainer.py

Deterministic explainer for AI ensemble decisions combining LSTM, CNN,
Technical, Sentiment, and Risk model outputs.

Computes weighted contributions, agreement levels, and decision reliability
classification without any generative or random logic.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MODEL_WEIGHTS: dict[str, float] = {
    "lstm":      0.30,
    "cnn":       0.20,
    "technical": 0.25,
    "sentiment": 0.15,
    "risk":      0.10,
}

AGREEMENT_THRESHOLDS = {
    "HIGH":   0.80,
    "MEDIUM": 0.55,
}

RELIABILITY_THRESHOLDS = {
    "STRONG":   0.75,
    "MODERATE": 0.50,
    "WEAK":     0.30,
}


class AgreementLevel(str, Enum):
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    LOW = "LOW"


class ExplanationStrength(str, Enum):
    STRONG = "STRONG"
    MODERATE = "MODERATE"
    WEAK = "WEAK"
    UNRELIABLE = "UNRELIABLE"


# ---------------------------------------------------------------------------
# Input / Output schemas
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class AIDecisionInput:
    """Validated input container for AI decision explanation."""
    lstm_score:      float   # 0.0 – 1.0 (bullish probability)
    cnn_score:       float   # 0.0 – 1.0 (bullish probability)
    technical_score: float   # 0.0 – 1.0
    sentiment_score: float   # 0.0 – 1.0
    risk_score:      float   # 0.0 – 1.0 (higher = more risk)
    final_decision:  str     # BUY | SELL | HOLD
    confidence:      float   # 0.0 – 1.0

    def __post_init__(self) -> None:
        scores = {
            "lstm_score": self.lstm_score,
            "cnn_score": self.cnn_score,
            "technical_score": self.technical_score,
            "sentiment_score": self.sentiment_score,
            "risk_score": self.risk_score,
            "confidence": self.confidence,
        }
        for name, val in scores.items():
            if not (0.0 <= val <= 1.0):
                raise ValueError(f"{name} must be in [0.0, 1.0]; received {val}.")
        if self.final_decision.upper() not in ("BUY", "SELL", "HOLD"):
            raise ValueError(f"final_decision must be BUY, SELL, or HOLD; received '{self.final_decision}'.")


# ---------------------------------------------------------------------------
# Core logic helpers
# ---------------------------------------------------------------------------

def _compute_weighted_contributions(inp: AIDecisionInput) -> dict[str, dict[str, float]]:
    """
    Compute each model's raw score, assigned weight, and weighted contribution.
    risk_score is inverted so that a high-risk score reduces directional confidence.
    """
    raw_scores = {
        "lstm":      inp.lstm_score,
        "cnn":       inp.cnn_score,
        "technical": inp.technical_score,
        "sentiment": inp.sentiment_score,
        "risk":      1.0 - inp.risk_score,   # invert: high risk → lower contribution
    }

    contributions: dict[str, dict[str, float]] = {}
    for model, weight in MODEL_WEIGHTS.items():
        raw = raw_scores[model]
        contributions[model] = {
            "raw_score":   round(raw, 4),
            "weight":      round(weight, 4),
            "contribution": round(raw * weight, 4),
        }
    return contributions


def _compute_agreement_level(inp: AIDecisionInput) -> tuple[AgreementLevel, float]:
    """
    Determine how much the directional models agree with the final decision.

    Agreement is computed as the proportion of directional models whose scores
    align with the declared final_decision (BUY = score > 0.5, SELL = score < 0.5).
    """
    directional_scores = [
        inp.lstm_score,
        inp.cnn_score,
        inp.technical_score,
        inp.sentiment_score,
    ]
    decision = inp.final_decision.upper()

    if decision == "BUY":
        aligned = sum(1 for s in directional_scores if s > 0.5)
    elif decision == "SELL":
        aligned = sum(1 for s in directional_scores if s < 0.5)
    else:  # HOLD
        aligned = sum(1 for s in directional_scores if 0.4 <= s <= 0.6)

    agreement_ratio = aligned / len(directional_scores)

    if agreement_ratio >= AGREEMENT_THRESHOLDS["HIGH"]:
        level = AgreementLevel.HIGH
    elif agreement_ratio >= AGREEMENT_THRESHOLDS["MEDIUM"]:
        level = AgreementLevel.MODERATE
    else:
        level = AgreementLevel.LOW

    return level, round(agreement_ratio, 4)


def _build_reasoning_points(
    inp: AIDecisionInput,
    contributions: dict[str, dict[str, float]],
    agreement_level: AgreementLevel,
) -> list[str]:
    """
    Generate deterministic, fact-based reasoning points from model scores.
    Each point is derived exclusively from numeric thresholds — no templates with randomness.
    """
    points: list[str] = []
    decision = inp.final_decision.upper()

    # LSTM analysis
    lstm = inp.lstm_score
    if lstm >= 0.70:
        points.append(
            f"LSTM trend model signals strong upside momentum (score={lstm:.2f}), "
            "indicating the recent price sequence favors continuation of the uptrend."
        )
    elif lstm <= 0.30:
        points.append(
            f"LSTM trend model signals strong downside momentum (score={lstm:.2f}), "
            "suggesting the sequential price pattern is bearish."
        )
    else:
        points.append(
            f"LSTM trend model is inconclusive (score={lstm:.2f}); "
            "sequential price pattern does not produce a high-confidence directional signal."
        )

    # CNN analysis
    cnn = inp.cnn_score
    if cnn >= 0.70:
        points.append(
            f"CNN pattern recognition identified a bullish formation (score={cnn:.2f}), "
            "consistent with technical breakout or accumulation patterns."
        )
    elif cnn <= 0.30:
        points.append(
            f"CNN pattern recognition flagged a bearish structure (score={cnn:.2f}), "
            "suggesting distribution or breakdown chart patterns."
        )
    else:
        points.append(
            f"CNN pattern recognition produced a neutral reading (score={cnn:.2f}); "
            "no dominant chart pattern detected."
        )

    # Technical scoring
    tech = inp.technical_score
    if tech >= 0.65:
        points.append(
            f"Technical scoring engine confirms positive momentum (score={tech:.2f}); "
            "the majority of technical indicators are aligned bullish."
        )
    elif tech <= 0.35:
        points.append(
            f"Technical scoring engine shows negative momentum (score={tech:.2f}); "
            "the majority of technical indicators are aligned bearish."
        )
    else:
        points.append(
            f"Technical scoring engine is mixed (score={tech:.2f}); "
            "indicators are not aligned in a single direction."
        )

    # Sentiment
    sent = inp.sentiment_score
    if sent >= 0.65:
        points.append(
            f"News sentiment is positive (score={sent:.2f}), supporting the directional thesis with favorable macro and headline tone."
        )
    elif sent <= 0.35:
        points.append(
            f"News sentiment is negative (score={sent:.2f}); adverse headlines and macro tone present a headwind."
        )
    else:
        points.append(
            f"News sentiment is neutral (score={sent:.2f}); no significant macro catalyst detected."
        )

    # Risk
    risk = inp.risk_score
    if risk >= 0.70:
        points.append(
            f"Risk model flags elevated risk exposure (score={risk:.2f}). "
            "Position sizing should be reduced and stop-loss parameters tightened."
        )
    elif risk <= 0.30:
        points.append(
            f"Risk model indicates low systemic risk (score={risk:.2f}), "
            "supporting full position sizing within the portfolio risk budget."
        )
    else:
        points.append(
            f"Risk model shows moderate risk (score={risk:.2f}); standard risk controls apply."
        )

    # Agreement summary
    if agreement_level == AgreementLevel.HIGH:
        points.append(
            f"Model agreement is HIGH: all major models align with the {decision} decision, "
            "significantly increasing signal reliability."
        )
    elif agreement_level == AgreementLevel.MODERATE:
        points.append(
            f"Model agreement is MODERATE: most but not all models support the {decision} decision. "
            "The minority divergence introduces an element of uncertainty."
        )
    else:
        points.append(
            f"Model agreement is LOW: significant disagreement exists across models for the {decision} decision. "
            "This signal carries elevated uncertainty and should be weighted conservatively."
        )

    return points


def _build_risk_adjustment_explanation(inp: AIDecisionInput) -> str:
    """
    Describe how the risk model adjusts the final decision confidence.
    """
    risk = inp.risk_score
    raw_confidence = inp.confidence

    if risk >= 0.70:
        penalty = round(risk * 0.20, 3)
        adj_conf = max(0.0, round(raw_confidence - penalty, 3))
        return (
            f"Risk model score of {risk:.2f} applied a downward confidence adjustment of {penalty:.3f}. "
            f"Effective confidence after risk adjustment: {adj_conf:.3f}. "
            "High systemic risk signals reduce the actionable certainty of any directional call."
        )
    elif risk >= 0.50:
        penalty = round(risk * 0.10, 3)
        adj_conf = max(0.0, round(raw_confidence - penalty, 3))
        return (
            f"Risk model score of {risk:.2f} applied a moderate confidence reduction of {penalty:.3f}. "
            f"Effective confidence after adjustment: {adj_conf:.3f}."
        )
    else:
        return (
            f"Risk model score of {risk:.2f} is within acceptable bounds. "
            f"No material confidence penalty applied. Reported confidence stands at {raw_confidence:.3f}."
        )


def _classify_explanation_strength(
    confidence: float,
    agreement_level: AgreementLevel,
) -> ExplanationStrength:
    """
    Classify overall decision reliability based on confidence and model agreement.
    """
    if confidence >= RELIABILITY_THRESHOLDS["STRONG"] and agreement_level == AgreementLevel.HIGH:
        return ExplanationStrength.STRONG
    elif confidence >= RELIABILITY_THRESHOLDS["MODERATE"] and agreement_level != AgreementLevel.LOW:
        return ExplanationStrength.MODERATE
    elif confidence >= RELIABILITY_THRESHOLDS["WEAK"]:
        return ExplanationStrength.WEAK
    else:
        return ExplanationStrength.UNRELIABLE


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def explain_ai_decision(
    lstm_score: float,
    cnn_score: float,
    technical_score: float,
    sentiment_score: float,
    risk_score: float,
    final_decision: str,
    confidence: float,
) -> dict[str, Any]:
    """
    Produce a structured, deterministic explanation for an AI ensemble decision.

    All scores must be in the range [0.0, 1.0].
    final_decision must be one of: BUY, SELL, HOLD.

    Returns
    -------
    dict containing:
        weighted_contributions      - per-model raw, weight, and contribution scores
        reasoning_points            - ordered list of human-readable rationale points
        agreement_level             - HIGH | MODERATE | LOW
        agreement_ratio             - float fraction of aligned models
        risk_adjustment_explanation - narrative description of risk impact on confidence
        explanation_strength        - STRONG | MODERATE | WEAK | UNRELIABLE
        final_decision              - echoed from input
        confidence                  - echoed from input
    """
    inp = AIDecisionInput(
        lstm_score=lstm_score,
        cnn_score=cnn_score,
        technical_score=technical_score,
        sentiment_score=sentiment_score,
        risk_score=risk_score,
        final_decision=final_decision.upper(),
        confidence=confidence,
    )

    logger.debug(
        "Explaining AI decision: decision=%s confidence=%.3f",
        inp.final_decision,
        inp.confidence,
    )

    contributions = _compute_weighted_contributions(inp)
    agreement_level, agreement_ratio = _compute_agreement_level(inp)
    reasoning_points = _build_reasoning_points(inp, contributions, agreement_level)
    risk_explanation = _build_risk_adjustment_explanation(inp)
    strength = _classify_explanation_strength(inp.confidence, agreement_level)

    return {
        "final_decision": inp.final_decision,
        "confidence": inp.confidence,
        "weighted_contributions": contributions,
        "reasoning_points": reasoning_points,
        "agreement_level": agreement_level.value,
        "agreement_ratio": agreement_ratio,
        "risk_adjustment_explanation": risk_explanation,
        "explanation_strength": strength.value,
    }