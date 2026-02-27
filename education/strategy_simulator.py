"""
strategy_simulator.py

Deterministic mathematical modeling of projected investment outcomes under
configurable market scenarios. No randomness — all projections are derived
from explicit financial formulas using supplied inputs.
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

CRASH_SHOCK_MULTIPLIER: float = -0.35        # Additional drawdown applied in crash scenario
HIGH_VOLATILITY_VARIANCE_PENALTY: float = 0.18  # Variance drag applied in high-volatility scenario
NORMAL_VARIANCE_PENALTY: float = 0.05

RISK_DRAWDOWN_COEFFICIENT: float = 0.40      # How much risk score scales worst-case drawdown
VOLATILITY_DRAG_COEFFICIENT: float = 0.25    # Volatility contribution to variance drag

RISK_ADJUSTMENT_DAMPENER: float = 0.60       # Scales down risk-adjusted projection conservatively

MASTERY_THRESHOLDS = {
    "LOW_RISK":    0.30,
    "MEDIUM_RISK": 0.60,
}


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ScenarioType(str, Enum):
    NORMAL = "NORMAL"
    MARKET_CRASH = "MARKET_CRASH"
    HIGH_VOLATILITY = "HIGH_VOLATILITY"


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class StrategySimulationResult:
    """
    Immutable result of a deterministic investment strategy simulation.
    All monetary values are in the same currency unit as initial_investment.
    """
    initial_investment:    float
    projected_value:       float
    projected_profit_loss: float
    risk_adjusted_value:   float
    worst_case_projection: float
    volatility_impact:     float
    scenario_applied:      str
    risk_commentary:       str
    educational_insight:   str

    def to_dict(self) -> dict[str, Any]:
        return {
            "initial_investment":    round(self.initial_investment, 2),
            "projected_value":       round(self.projected_value, 2),
            "projected_profit_loss": round(self.projected_profit_loss, 2),
            "risk_adjusted_value":   round(self.risk_adjusted_value, 2),
            "worst_case_projection": round(self.worst_case_projection, 2),
            "volatility_impact":     round(self.volatility_impact, 2),
            "scenario_applied":      self.scenario_applied,
            "risk_commentary":       self.risk_commentary,
            "educational_insight":   self.educational_insight,
        }


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def _validate_inputs(
    investment_amount: float,
    predicted_change_percent: float,
    risk_score: float,
    volatility_score: float,
) -> None:
    if investment_amount <= 0:
        raise ValueError(f"investment_amount must be positive; received {investment_amount}.")
    if not (-100.0 <= predicted_change_percent <= 1000.0):
        raise ValueError(
            f"predicted_change_percent must be in [-100, 1000]; received {predicted_change_percent}."
        )
    if not (0.0 <= risk_score <= 1.0):
        raise ValueError(f"risk_score must be in [0.0, 1.0]; received {risk_score}.")
    if not (0.0 <= volatility_score <= 1.0):
        raise ValueError(f"volatility_score must be in [0.0, 1.0]; received {volatility_score}.")


# ---------------------------------------------------------------------------
# Financial computation helpers
# ---------------------------------------------------------------------------

def _compute_base_projection(
    investment: float,
    predicted_change_pct: float,
) -> float:
    """Apply predicted percentage change to compute raw projected value."""
    return investment * (1.0 + predicted_change_pct / 100.0)


def _compute_variance_drag(
    investment: float,
    volatility_score: float,
    scenario: ScenarioType,
) -> float:
    """
    Compute variance drag — the mathematical cost of volatility on compound returns.
    Higher volatility reduces expected compounded value even with the same arithmetic mean.
    Formula: drag = investment * volatility_score * penalty_coefficient
    """
    if scenario == ScenarioType.HIGH_VOLATILITY:
        penalty = HIGH_VOLATILITY_VARIANCE_PENALTY
    elif scenario == ScenarioType.MARKET_CRASH:
        penalty = HIGH_VOLATILITY_VARIANCE_PENALTY * 0.75
    else:
        penalty = NORMAL_VARIANCE_PENALTY

    return investment * volatility_score * penalty


def _compute_risk_adjusted_value(
    projected_value: float,
    risk_score: float,
    investment: float,
) -> float:
    """
    Risk-adjusted value discounts the projected value by the risk exposure.
    Risk adjustment pulls the projection toward the initial investment proportionally.
    """
    risk_dampened = projected_value - (
        (projected_value - investment) * risk_score * RISK_ADJUSTMENT_DAMPENER
    )
    return max(0.0, risk_dampened)


def _compute_worst_case(
    investment: float,
    projected_value: float,
    risk_score: float,
    volatility_score: float,
    scenario: ScenarioType,
) -> float:
    """
    Worst-case projection applies maximum drawdown based on risk, volatility, and scenario shock.
    """
    base_drawdown = investment * risk_score * RISK_DRAWDOWN_COEFFICIENT
    vol_drawdown = investment * volatility_score * VOLATILITY_DRAG_COEFFICIENT

    if scenario == ScenarioType.MARKET_CRASH:
        shock = investment * abs(CRASH_SHOCK_MULTIPLIER)
    else:
        shock = 0.0

    worst = investment - base_drawdown - vol_drawdown - shock
    return max(0.0, worst)


def _compute_scenario_projected_value(
    base_projected: float,
    investment: float,
    volatility_score: float,
    scenario: ScenarioType,
) -> float:
    """
    Adjust the base projection for scenario-specific effects.
    MARKET_CRASH applies a shock multiplier on top of the base projection.
    HIGH_VOLATILITY applies a variance penalty.
    """
    drag = _compute_variance_drag(investment, volatility_score, scenario)

    if scenario == ScenarioType.MARKET_CRASH:
        crash_shock = investment * abs(CRASH_SHOCK_MULTIPLIER)
        return max(0.0, base_projected - drag - crash_shock)
    elif scenario == ScenarioType.HIGH_VOLATILITY:
        return max(0.0, base_projected - drag)
    else:
        return max(0.0, base_projected - drag)


# ---------------------------------------------------------------------------
# Commentary builders
# ---------------------------------------------------------------------------

def _build_risk_commentary(
    risk_score: float,
    volatility_score: float,
    scenario: ScenarioType,
) -> str:
    if scenario == ScenarioType.MARKET_CRASH:
        return (
            f"Scenario: MARKET CRASH. A systemic shock of {abs(CRASH_SHOCK_MULTIPLIER) * 100:.0f}% "
            f"has been applied on top of the base risk (score={risk_score:.2f}) and volatility "
            f"(score={volatility_score:.2f}) penalties. Capital preservation takes priority over return maximization."
        )
    elif scenario == ScenarioType.HIGH_VOLATILITY:
        return (
            f"Scenario: HIGH VOLATILITY. Variance drag of {HIGH_VOLATILITY_VARIANCE_PENALTY * 100:.0f}% "
            f"applied due to elevated volatility (score={volatility_score:.2f}). "
            f"High-volatility environments erode compounded returns even when directional calls are correct."
        )
    else:
        if risk_score >= MASTERY_THRESHOLDS["MEDIUM_RISK"]:
            return (
                f"Risk score {risk_score:.2f} indicates elevated exposure. "
                "The risk-adjusted projection reflects a significant discount to the base scenario. "
                "Consider reducing position concentration or increasing hedging."
            )
        elif risk_score >= MASTERY_THRESHOLDS["LOW_RISK"]:
            return (
                f"Risk score {risk_score:.2f} reflects moderate exposure. "
                "Standard risk controls apply. Monitor for regime changes."
            )
        else:
            return (
                f"Risk score {risk_score:.2f} is low. "
                "Capital is not excessively exposed. Full position sizing is within normal risk budget parameters."
            )


def _build_educational_insight(
    projected_profit_loss: float,
    risk_score: float,
    volatility_score: float,
    scenario: ScenarioType,
) -> str:
    direction = "profit" if projected_profit_loss >= 0 else "loss"

    if scenario == ScenarioType.MARKET_CRASH:
        return (
            "Market crash scenarios illustrate the importance of drawdown planning. "
            "Even a fundamentally correct directional thesis can result in significant capital loss "
            "when a systemic shock occurs. Portfolio stress-testing against tail-risk events is "
            "a core principle of institutional risk management."
        )
    elif scenario == ScenarioType.HIGH_VOLATILITY:
        return (
            "This simulation demonstrates variance drag — the mathematical reality that high volatility "
            "reduces compounded returns even when the average return is positive. "
            "A 20% gain followed by a 20% loss does not return to breakeven; it results in a 4% net loss. "
            "Volatility is not just uncertainty — it is a direct cost to compounded wealth."
        )
    elif projected_profit_loss >= 0 and risk_score < MASTERY_THRESHOLDS["MEDIUM_RISK"]:
        return (
            f"This simulation projects a {direction} under normal conditions with controlled risk. "
            "Low risk and positive expected return is the target profile for disciplined investing. "
            "However, projected values are not guaranteed — they represent probability-weighted expectations, "
            "not certainties."
        )
    elif projected_profit_loss >= 0 and risk_score >= MASTERY_THRESHOLDS["MEDIUM_RISK"]:
        return (
            f"The projected {direction} comes with elevated risk exposure. "
            "High-risk, high-return profiles are susceptible to large drawdowns in adverse conditions. "
            "The risk-adjusted projection reflects what a conservative risk model would assign as the "
            "realistic expected outcome after accounting for downside probability."
        )
    else:
        return (
            "The simulation projects a net loss under current parameters. "
            "This outcome highlights the importance of not entering positions when the expected value "
            "is negative after accounting for risk and volatility. "
            "Capital preservation in negative-expectation scenarios is the rational strategy."
        )


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def simulate_strategy(
    investment_amount: float,
    predicted_change_percent: float,
    risk_score: float,
    volatility_score: float,
    scenario_type: ScenarioType = ScenarioType.NORMAL,
) -> StrategySimulationResult:
    """
    Simulate projected investment outcomes using deterministic financial modeling.

    Parameters
    ----------
    investment_amount:
        Principal capital in currency units. Must be positive.
    predicted_change_percent:
        AI-predicted percentage change in asset value. Range: [-100, 1000].
    risk_score:
        Normalized risk exposure score from the risk model. Range: [0.0, 1.0].
    volatility_score:
        Normalized volatility score. Range: [0.0, 1.0].
    scenario_type:
        ScenarioType enum. NORMAL | MARKET_CRASH | HIGH_VOLATILITY.

    Returns
    -------
    StrategySimulationResult
        Immutable dataclass with all computed projections and explanatory strings.
    """
    _validate_inputs(investment_amount, predicted_change_percent, risk_score, volatility_score)

    logger.info(
        "simulate_strategy: investment=%.2f change=%.2f%% risk=%.2f vol=%.2f scenario=%s",
        investment_amount,
        predicted_change_percent,
        risk_score,
        volatility_score,
        scenario_type.value,
    )

    base_projected = _compute_base_projection(investment_amount, predicted_change_percent)
    variance_drag = _compute_variance_drag(investment_amount, volatility_score, scenario_type)
    projected_value = _compute_scenario_projected_value(
        base_projected, investment_amount, volatility_score, scenario_type
    )
    projected_profit_loss = projected_value - investment_amount
    risk_adjusted_value = _compute_risk_adjusted_value(projected_value, risk_score, investment_amount)
    worst_case = _compute_worst_case(
        investment_amount, projected_value, risk_score, volatility_score, scenario_type
    )
    risk_commentary = _build_risk_commentary(risk_score, volatility_score, scenario_type)
    educational_insight = _build_educational_insight(
        projected_profit_loss, risk_score, volatility_score, scenario_type
    )

    return StrategySimulationResult(
        initial_investment=investment_amount,
        projected_value=projected_value,
        projected_profit_loss=projected_profit_loss,
        risk_adjusted_value=risk_adjusted_value,
        worst_case_projection=worst_case,
        volatility_impact=variance_drag,
        scenario_applied=scenario_type.value,
        risk_commentary=risk_commentary,
        educational_insight=educational_insight,
    )