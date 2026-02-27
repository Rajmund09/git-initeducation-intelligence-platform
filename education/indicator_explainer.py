"""
indicator_explainer.py

Deterministic, rule-based explainer for technical financial indicators.
Follows the Open-Closed Principle: extend by adding new handler classes,
not by modifying existing ones.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Domain types
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class IndicatorContext:
    """Optional contextual metadata supplied alongside an indicator value."""
    timeframe: str = "1D"
    asset_class: str = "equity"
    market_regime: str = "unknown"   # trending | ranging | volatile | unknown
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class IndicatorExplanation:
    """Structured output returned by every indicator handler."""
    indicator_name: str
    value: float
    definition: str
    market_signal: str          # BULLISH | BEARISH | NEUTRAL | OVERBOUGHT | OVERSOLD
    interpretation: str
    trading_bias: str           # BUY | SELL | HOLD | WAIT
    confidence_hint: str        # HIGH | MEDIUM | LOW
    risk_note: str
    context_applied: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "indicator_name": self.indicator_name,
            "value": self.value,
            "definition": self.definition,
            "market_signal": self.market_signal,
            "interpretation": self.interpretation,
            "trading_bias": self.trading_bias,
            "confidence_hint": self.confidence_hint,
            "risk_note": self.risk_note,
            "context_applied": self.context_applied,
        }


# ---------------------------------------------------------------------------
# Abstract base handler
# ---------------------------------------------------------------------------

class BaseIndicatorHandler(ABC):
    """Abstract handler. Subclasses implement `explain` for one indicator type."""

    @property
    @abstractmethod
    def indicator_name(self) -> str: ...

    @abstractmethod
    def explain(
        self,
        value: float,
        context: Optional[IndicatorContext] = None,
    ) -> IndicatorExplanation: ...


# ---------------------------------------------------------------------------
# Concrete handlers
# ---------------------------------------------------------------------------

class RSIHandler(BaseIndicatorHandler):
    """
    Relative Strength Index handler.
    Standard 14-period RSI with classic overbought/oversold thresholds.
    """

    OVERBOUGHT = 70.0
    OVERSOLD = 30.0
    EXTREME_HIGH = 80.0
    EXTREME_LOW = 20.0

    @property
    def indicator_name(self) -> str:
        return "RSI"

    def explain(
        self,
        value: float,
        context: Optional[IndicatorContext] = None,
    ) -> IndicatorExplanation:
        context_applied = context is not None

        if value >= self.EXTREME_HIGH:
            signal = "OVERBOUGHT"
            interpretation = (
                f"RSI at {value:.1f} is in extreme overbought territory (>={self.EXTREME_HIGH}). "
                "Price momentum is heavily skewed to the upside; mean-reversion probability is elevated."
            )
            bias = "SELL"
            confidence = "HIGH"
            risk_note = "Rapid reversals are common at extreme RSI levels. Use tight stops."
        elif value >= self.OVERBOUGHT:
            signal = "OVERBOUGHT"
            interpretation = (
                f"RSI at {value:.1f} exceeds the overbought threshold ({self.OVERBOUGHT}). "
                "Upward momentum remains but exhaustion signals are present."
            )
            bias = "HOLD" if (context and context.market_regime == "trending") else "SELL"
            confidence = "MEDIUM"
            risk_note = "In strong trending markets RSI can remain overbought for extended periods."
        elif value <= self.EXTREME_LOW:
            signal = "OVERSOLD"
            interpretation = (
                f"RSI at {value:.1f} is in extreme oversold territory (<={self.EXTREME_LOW}). "
                "Selling pressure is excessive; a technical bounce is statistically probable."
            )
            bias = "BUY"
            confidence = "HIGH"
            risk_note = "Oversold readings in downtrends can persist. Confirm with volume and support levels."
        elif value <= self.OVERSOLD:
            signal = "OVERSOLD"
            interpretation = (
                f"RSI at {value:.1f} is below the oversold threshold ({self.OVERSOLD}). "
                "Bearish momentum is dominant but reversal conditions are developing."
            )
            bias = "BUY"
            confidence = "MEDIUM"
            risk_note = "Do not enter long positions until a bullish divergence or candlestick confirmation appears."
        elif 45.0 <= value <= 55.0:
            signal = "NEUTRAL"
            interpretation = (
                f"RSI at {value:.1f} is in the neutral midrange (45–55). "
                "Neither buyers nor sellers hold a decisive advantage."
            )
            bias = "HOLD"
            confidence = "LOW"
            risk_note = "Neutral RSI offers no directional edge; rely on other indicators for signals."
        elif value > 55.0:
            signal = "BULLISH"
            interpretation = (
                f"RSI at {value:.1f} is in bullish territory (55–70). "
                "Buying pressure is present without triggering an overbought warning."
            )
            bias = "BUY"
            confidence = "MEDIUM"
            risk_note = "Watch for RSI divergence with price if the reading climbs above 65."
        else:
            signal = "BEARISH"
            interpretation = (
                f"RSI at {value:.1f} is in bearish territory (30–45). "
                "Selling pressure dominates without reaching an oversold extreme."
            )
            bias = "SELL"
            confidence = "MEDIUM"
            risk_note = "Bearish RSI in a ranging market may quickly revert; use additional confirmation."

        return IndicatorExplanation(
            indicator_name=self.indicator_name,
            value=value,
            definition=(
                "The Relative Strength Index (RSI) is a momentum oscillator that measures "
                "the speed and magnitude of price changes on a 0–100 scale. "
                "Values above 70 indicate overbought conditions; values below 30 indicate oversold conditions."
            ),
            market_signal=signal,
            interpretation=interpretation,
            trading_bias=bias,
            confidence_hint=confidence,
            risk_note=risk_note,
            context_applied=context_applied,
        )


class EMAHandler(BaseIndicatorHandler):
    """
    Exponential Moving Average handler.
    Requires current price in context.extra['current_price'] for accurate signal generation.
    """

    @property
    def indicator_name(self) -> str:
        return "EMA"

    def explain(
        self,
        value: float,
        context: Optional[IndicatorContext] = None,
    ) -> IndicatorExplanation:
        current_price: Optional[float] = None
        context_applied = False

        if context and "current_price" in context.extra:
            current_price = float(context.extra["current_price"])
            context_applied = True

        if current_price is not None:
            deviation_pct = ((current_price - value) / value) * 100.0
            if deviation_pct > 3.0:
                signal = "BULLISH"
                interpretation = (
                    f"Price ({current_price:.2f}) is {deviation_pct:.1f}% above the EMA ({value:.2f}). "
                    "The asset is trading well above its moving average, confirming upward momentum."
                )
                bias = "BUY"
                confidence = "HIGH" if deviation_pct > 5.0 else "MEDIUM"
                risk_note = "Extended deviation above EMA increases the probability of a mean-reversion pullback."
            elif deviation_pct < -3.0:
                signal = "BEARISH"
                interpretation = (
                    f"Price ({current_price:.2f}) is {abs(deviation_pct):.1f}% below the EMA ({value:.2f}). "
                    "The asset is trading below its moving average, indicating downward momentum."
                )
                bias = "SELL"
                confidence = "HIGH" if deviation_pct < -5.0 else "MEDIUM"
                risk_note = "Price below EMA in a downtrend can accelerate; avoid catching falling knives."
            else:
                signal = "NEUTRAL"
                interpretation = (
                    f"Price ({current_price:.2f}) is within 3% of the EMA ({value:.2f}). "
                    "The asset is consolidating around its moving average. Breakout direction is undetermined."
                )
                bias = "HOLD"
                confidence = "LOW"
                risk_note = "Wait for a decisive close above or below the EMA before taking a directional position."
        else:
            signal = "NEUTRAL"
            interpretation = (
                f"EMA value is {value:.2f}. No current price provided; "
                "relative signal cannot be computed. Supply 'current_price' in context.extra."
            )
            bias = "HOLD"
            confidence = "LOW"
            risk_note = "Signal quality is degraded without current price context."

        return IndicatorExplanation(
            indicator_name=self.indicator_name,
            value=value,
            definition=(
                "The Exponential Moving Average (EMA) is a weighted moving average that gives "
                "greater importance to recent price data. It reacts faster than a Simple Moving Average (SMA) "
                "to recent price changes, making it preferred for short-to-medium-term trend identification."
            ),
            market_signal=signal,
            interpretation=interpretation,
            trading_bias=bias,
            confidence_hint=confidence,
            risk_note=risk_note,
            context_applied=context_applied,
        )


class SMAHandler(BaseIndicatorHandler):
    """
    Simple Moving Average handler.
    Signal is computed relative to current price when provided.
    """

    @property
    def indicator_name(self) -> str:
        return "SMA"

    def explain(
        self,
        value: float,
        context: Optional[IndicatorContext] = None,
    ) -> IndicatorExplanation:
        current_price: Optional[float] = None
        context_applied = False

        if context and "current_price" in context.extra:
            current_price = float(context.extra["current_price"])
            context_applied = True

        if current_price is not None:
            if current_price > value * 1.02:
                signal = "BULLISH"
                interpretation = (
                    f"Price ({current_price:.2f}) is above the SMA ({value:.2f}). "
                    "The asset has been trending higher over the average period."
                )
                bias = "BUY"
                confidence = "MEDIUM"
                risk_note = "SMA is a lagging indicator; it confirms trends rather than predicting reversals."
            elif current_price < value * 0.98:
                signal = "BEARISH"
                interpretation = (
                    f"Price ({current_price:.2f}) is below the SMA ({value:.2f}). "
                    "The asset has been trending lower on average over the lookback period."
                )
                bias = "SELL"
                confidence = "MEDIUM"
                risk_note = "SMA crossovers can produce whipsaws in choppy markets."
            else:
                signal = "NEUTRAL"
                interpretation = (
                    f"Price ({current_price:.2f}) is near the SMA ({value:.2f}). "
                    "The asset is testing its average price level; no clear directional edge."
                )
                bias = "HOLD"
                confidence = "LOW"
                risk_note = "SMA levels often act as dynamic support/resistance; monitor price reaction closely."
        else:
            signal = "NEUTRAL"
            interpretation = (
                f"SMA value is {value:.2f}. No current price provided for relative comparison."
            )
            bias = "HOLD"
            confidence = "LOW"
            risk_note = "Provide 'current_price' in context.extra for a directional signal."

        return IndicatorExplanation(
            indicator_name=self.indicator_name,
            value=value,
            definition=(
                "The Simple Moving Average (SMA) is the arithmetic mean of closing prices over a "
                "specified period. It smooths price data to identify trend direction. "
                "Unlike EMA, it weighs all periods equally, making it slower to react to recent changes."
            ),
            market_signal=signal,
            interpretation=interpretation,
            trading_bias=bias,
            confidence_hint=confidence,
            risk_note=risk_note,
            context_applied=context_applied,
        )


class VolumeHandler(BaseIndicatorHandler):
    """
    Volume handler.
    Requires 'avg_volume' in context.extra for ratio-based analysis.
    """

    HIGH_VOLUME_RATIO = 1.5
    LOW_VOLUME_RATIO = 0.5

    @property
    def indicator_name(self) -> str:
        return "Volume"

    def explain(
        self,
        value: float,
        context: Optional[IndicatorContext] = None,
    ) -> IndicatorExplanation:
        context_applied = False
        avg_volume: Optional[float] = None

        if context and "avg_volume" in context.extra:
            avg_volume = float(context.extra["avg_volume"])
            context_applied = True

        if avg_volume and avg_volume > 0:
            ratio = value / avg_volume
            if ratio >= self.HIGH_VOLUME_RATIO:
                signal = "BULLISH"
                interpretation = (
                    f"Current volume ({value:,.0f}) is {ratio:.1f}x the average ({avg_volume:,.0f}). "
                    "Elevated volume signals strong institutional participation and validates price moves."
                )
                bias = "BUY"
                confidence = "HIGH"
                risk_note = "High volume on a down day is a bearish sign; confirm the price direction alongside volume."
            elif ratio <= self.LOW_VOLUME_RATIO:
                signal = "NEUTRAL"
                interpretation = (
                    f"Current volume ({value:,.0f}) is only {ratio:.1f}x the average ({avg_volume:,.0f}). "
                    "Low volume suggests weak conviction; price moves are less reliable."
                )
                bias = "HOLD"
                confidence = "LOW"
                risk_note = "Low-volume breakouts frequently fail. Wait for volume confirmation."
            else:
                signal = "NEUTRAL"
                interpretation = (
                    f"Volume ({value:,.0f}) is within normal range ({ratio:.1f}x average). "
                    "No abnormal institutional activity detected."
                )
                bias = "HOLD"
                confidence = "LOW"
                risk_note = "Ordinary volume does not add directional confidence to a signal."
        else:
            signal = "NEUTRAL"
            interpretation = (
                f"Volume is {value:,.0f}. Average volume not provided; relative analysis unavailable."
            )
            bias = "HOLD"
            confidence = "LOW"
            risk_note = "Supply 'avg_volume' in context.extra to enable ratio-based volume analysis."

        return IndicatorExplanation(
            indicator_name=self.indicator_name,
            value=value,
            definition=(
                "Volume represents the total number of shares or contracts traded during a given period. "
                "It is a primary confirmation tool: high volume on a directional move validates the trend, "
                "while low volume suggests weak conviction or potential false breakouts."
            ),
            market_signal=signal,
            interpretation=interpretation,
            trading_bias=bias,
            confidence_hint=confidence,
            risk_note=risk_note,
            context_applied=context_applied,
        )


class VolatilityHandler(BaseIndicatorHandler):
    """
    Volatility handler.
    Accepts annualized volatility as a percentage (e.g., 25.0 = 25%).
    """

    LOW_THRESHOLD = 15.0
    HIGH_THRESHOLD = 40.0
    EXTREME_THRESHOLD = 60.0

    @property
    def indicator_name(self) -> str:
        return "Volatility"

    def explain(
        self,
        value: float,
        context: Optional[IndicatorContext] = None,
    ) -> IndicatorExplanation:
        context_applied = context is not None

        if value >= self.EXTREME_THRESHOLD:
            signal = "BEARISH"
            interpretation = (
                f"Annualized volatility at {value:.1f}% is extreme (>={self.EXTREME_THRESHOLD}%). "
                "Market conditions are highly unstable. Price discovery is impaired and slippage risk is elevated."
            )
            bias = "WAIT"
            confidence = "HIGH"
            risk_note = "Extreme volatility dramatically widens bid-ask spreads and increases stop-out risk. Reduce position sizing."
        elif value >= self.HIGH_THRESHOLD:
            signal = "BEARISH"
            interpretation = (
                f"Volatility at {value:.1f}% is elevated (>={self.HIGH_THRESHOLD}%). "
                "Uncertainty is high and position risk is above normal."
            )
            bias = "HOLD"
            confidence = "MEDIUM"
            risk_note = "Increase margin buffer and reduce leverage in high-volatility environments."
        elif value <= self.LOW_THRESHOLD:
            signal = "NEUTRAL"
            interpretation = (
                f"Volatility at {value:.1f}% is compressed (<={self.LOW_THRESHOLD}%). "
                "Low-volatility regimes often precede sharp directional moves (volatility expansion)."
            )
            bias = "WAIT"
            confidence = "MEDIUM"
            risk_note = "Compressed volatility is not safe; it is a coiled spring. Be prepared for a sudden expansion."
        else:
            signal = "NEUTRAL"
            interpretation = (
                f"Volatility at {value:.1f}% is within a normal range ({self.LOW_THRESHOLD}–{self.HIGH_THRESHOLD}%). "
                "Market conditions support standard risk management parameters."
            )
            bias = "HOLD"
            confidence = "MEDIUM"
            risk_note = "Monitor for volatility regime changes, especially around earnings or macro events."

        return IndicatorExplanation(
            indicator_name=self.indicator_name,
            value=value,
            definition=(
                "Volatility measures the statistical dispersion of returns for an asset, "
                "typically expressed as annualized standard deviation of daily returns. "
                "It is a primary input into options pricing, position sizing, and risk models."
            ),
            market_signal=signal,
            interpretation=interpretation,
            trading_bias=bias,
            confidence_hint=confidence,
            risk_note=risk_note,
            context_applied=context_applied,
        )


# ---------------------------------------------------------------------------
# Handler registry
# ---------------------------------------------------------------------------

_HANDLER_REGISTRY: dict[str, BaseIndicatorHandler] = {
    handler.indicator_name.upper(): handler
    for handler in [
        RSIHandler(),
        EMAHandler(),
        SMAHandler(),
        VolumeHandler(),
        VolatilityHandler(),
    ]
}


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def explain_indicator(
    indicator: str,
    value: float,
    context: Optional[IndicatorContext] = None,
) -> dict[str, Any]:
    """
    Explain a technical indicator using deterministic rule-based logic.

    Parameters
    ----------
    indicator:
        Name of the indicator (case-insensitive). Supported: RSI, EMA, SMA, Volume, Volatility.
    value:
        The current numeric value of the indicator.
    context:
        Optional IndicatorContext providing timeframe, asset class, and extra key/value pairs
        consumed by individual handlers (e.g., current_price, avg_volume).

    Returns
    -------
    dict
        Structured explanation conforming to IndicatorExplanation schema.

    Raises
    ------
    ValueError
        If the indicator name is not registered.
    """
    key = indicator.strip().upper()
    handler = _HANDLER_REGISTRY.get(key)

    if handler is None:
        supported = ", ".join(sorted(_HANDLER_REGISTRY.keys()))
        raise ValueError(
            f"Unsupported indicator '{indicator}'. Supported indicators: {supported}."
        )

    logger.debug("Explaining indicator '%s' with value=%.4f", indicator, value)
    explanation = handler.explain(value, context)
    return explanation.to_dict()