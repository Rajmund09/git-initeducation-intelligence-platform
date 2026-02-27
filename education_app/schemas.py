"""
schemas.py

Pydantic v2 request and response schemas for the Education Intelligence API.

Design principles:
    - Every field carries a description for Swagger auto-documentation.
    - Example payloads are embedded via model_config / json_schema_extra.
    - Response schemas mirror engine output structures exactly.
    - Validation constraints are tight; no silent coercion of invalid data.
    - All models are immutable (frozen) to prevent accidental mutation in routes.
"""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

# ===========================================================================
# Shared sub-schemas
# ===========================================================================

class IndicatorContextSchema(BaseModel):
    """Optional context supplied alongside an indicator value."""

    timeframe: str = Field(
        default="1D",
        description="Candle timeframe (e.g. '1D', '4H', '1H').",
        examples=["1D"],
    )
    asset_class: str = Field(
        default="equity",
        description="Asset class (equity, crypto, forex, commodity).",
        examples=["equity"],
    )
    market_regime: str = Field(
        default="unknown",
        description="Current market regime: trending | ranging | volatile | unknown.",
        examples=["trending"],
    )
    extra: dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Arbitrary key/value pairs consumed by individual handlers. "
            "EMA/SMA: supply 'current_price'. Volume: supply 'avg_volume'."
        ),
        examples=[{"current_price": 194.75}],
    )


class WeightedContributionSchema(BaseModel):
    """Per-model score and weighted contribution in an AI ensemble decision."""

    raw_score:    float = Field(description="Model's raw directional score (0.0–1.0).")
    weight:       float = Field(description="Assigned model weight in the ensemble.")
    contribution: float = Field(description="raw_score × weight.")


class QuizQuestionSchema(BaseModel):
    """A single quiz question as submitted in the quiz payload."""

    question_id:        str  = Field(description="Unique question identifier.")
    question_text:      str  = Field(description="Full question text.")
    options:            list[str] = Field(
        description="Ordered answer options (index 0 = A, 1 = B, …).",
        min_length=2,
        max_length=6,
    )
    correct_option_key: str  = Field(description="Correct answer key: A | B | C | D.")
    topic:              str  = Field(
        description="Topic tag: RSI | VOLATILITY | RISK | DIVERSIFICATION | SENTIMENT | EMA | SMA | VOLUME | GENERAL."
    )
    difficulty:         str  = Field(description="Difficulty: EASY | MEDIUM | HARD.")
    explanation:        str  = Field(description="Educational commentary shown when answer is incorrect.")


class UserAnswerSchema(BaseModel):
    """A single user answer for one quiz question."""

    question_id:    str           = Field(description="Must match a question_id in the submitted question list.")
    selected_key:   str           = Field(description="User's selected option key: A | B | C | D.")
    time_taken_sec: Optional[int] = Field(default=None, description="Time taken to answer in seconds (optional).")


class TopicPerformanceSchema(BaseModel):
    """Aggregated quiz performance for a single topic."""

    topic:            str   = Field(description="Topic name.")
    attempted:        int   = Field(description="Questions attempted for this topic.")
    correct:          int   = Field(description="Correct answers for this topic.")
    accuracy_percent: float = Field(description="Accuracy percentage (0–100).")
    performance_band: str   = Field(description="STRONG | DEVELOPING | WEAK.")


class QuestionResultSchema(BaseModel):
    """Per-question evaluation result."""

    question_id:  str  = Field(description="Question identifier.")
    topic:        str  = Field(description="Topic tag.")
    difficulty:   str  = Field(description="Difficulty level.")
    is_correct:   bool = Field(description="Whether the user answered correctly.")
    selected_key: str  = Field(description="User's selected answer key.")
    correct_key:  str  = Field(description="The correct answer key.")
    explanation:  str  = Field(description="Empty if correct; educational commentary if incorrect.")


class BadgeSchema(BaseModel):
    """An earned achievement badge."""

    badge_id:    str = Field(description="Unique badge identifier.")
    name:        str = Field(description="Human-readable badge name.")
    tier:        str = Field(description="Badge tier: BRONZE | SILVER | GOLD.")
    description: str = Field(description="Criteria that earned this badge.")


# ===========================================================================
# 1. Indicator Explainer
# ===========================================================================

class IndicatorExplainRequest(BaseModel):
    """Request payload for the indicator explanation endpoint."""

    indicator: str = Field(
        description="Indicator name. Supported: RSI, EMA, SMA, Volume, Volatility.",
        examples=["RSI"],
    )
    value: float = Field(
        description="Current numeric value of the indicator.",
        examples=[73.5],
    )
    context: Optional[IndicatorContextSchema] = Field(
        default=None,
        description="Optional market context to enrich the explanation.",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "indicator": "RSI",
                "value": 73.5,
                "context": {
                    "timeframe": "1D",
                    "asset_class": "equity",
                    "market_regime": "trending",
                    "extra": {},
                },
            }
        }
    }


class IndicatorExplainResponse(BaseModel):
    """Structured explanation for a single technical indicator."""

    indicator_name:  str  = Field(description="Canonical indicator name.")
    value:           float = Field(description="The indicator value that was evaluated.")
    definition:      str  = Field(description="Textbook definition of the indicator.")
    market_signal:   str  = Field(description="Signal classification: BULLISH | BEARISH | NEUTRAL | OVERBOUGHT | OVERSOLD.")
    interpretation:  str  = Field(description="Context-specific plain-English interpretation.")
    trading_bias:    str  = Field(description="Suggested trading bias: BUY | SELL | HOLD | WAIT.")
    confidence_hint: str  = Field(description="Signal confidence: HIGH | MEDIUM | LOW.")
    risk_note:       str  = Field(description="Risk caveat specific to the current reading.")
    context_applied: bool = Field(description="Whether optional context was incorporated.")


# ===========================================================================
# 2. AI Decision Explainer
# ===========================================================================

class AIDecisionExplainRequest(BaseModel):
    """Request payload for the AI ensemble decision explanation endpoint."""

    lstm_score:      float = Field(ge=0.0, le=1.0, description="LSTM trend model bullish probability (0.0–1.0).", examples=[0.78])
    cnn_score:       float = Field(ge=0.0, le=1.0, description="CNN pattern recognition bullish probability (0.0–1.0).", examples=[0.72])
    technical_score: float = Field(ge=0.0, le=1.0, description="Technical scoring engine composite score (0.0–1.0).", examples=[0.68])
    sentiment_score: float = Field(ge=0.0, le=1.0, description="News sentiment score (0.0–1.0).", examples=[0.61])
    risk_score:      float = Field(ge=0.0, le=1.0, description="Risk model exposure score (0.0–1.0; higher = more risk).", examples=[0.35])
    final_decision:  str   = Field(description="AI ensemble final decision: BUY | SELL | HOLD.", examples=["BUY"])
    confidence:      float = Field(ge=0.0, le=1.0, description="Overall ensemble confidence (0.0–1.0).", examples=[0.76])

    @field_validator("final_decision")
    @classmethod
    def validate_decision(cls, v: str) -> str:
        val = v.upper()
        if val not in {"BUY", "SELL", "HOLD"}:
            raise ValueError(f"final_decision must be BUY, SELL, or HOLD; received '{v}'.")
        return val

    model_config = {
        "json_schema_extra": {
            "example": {
                "lstm_score": 0.78,
                "cnn_score": 0.72,
                "technical_score": 0.68,
                "sentiment_score": 0.61,
                "risk_score": 0.35,
                "final_decision": "BUY",
                "confidence": 0.76,
            }
        }
    }


class AIDecisionExplainResponse(BaseModel):
    """Structured explanation of an AI ensemble decision."""

    final_decision:               str                                    = Field(description="Echoed final decision.")
    confidence:                   float                                  = Field(description="Echoed ensemble confidence.")
    weighted_contributions:       dict[str, WeightedContributionSchema]  = Field(description="Per-model score, weight, and contribution.")
    reasoning_points:             list[str]                              = Field(description="Ordered list of human-readable rationale points.")
    agreement_level:              str                                    = Field(description="Model agreement: HIGH | MODERATE | LOW.")
    agreement_ratio:              float                                  = Field(description="Fraction of directional models aligned with the decision.")
    risk_adjustment_explanation:  str                                    = Field(description="Narrative description of the risk model's impact on confidence.")
    explanation_strength:         str                                    = Field(description="Decision reliability: STRONG | MODERATE | WEAK | UNRELIABLE.")


# ===========================================================================
# 3. Prediction Playground
# ===========================================================================

class PredictionPlaygroundRequest(BaseModel):
    """Request payload for evaluating a user market prediction."""

    user_prediction:  str   = Field(description="User's directional call: BUY | SELL | HOLD.", examples=["BUY"])
    user_confidence:  float = Field(ge=0.0, le=1.0, description="User's stated confidence (0.0–1.0).", examples=[0.9])
    ai_prediction:    str   = Field(description="AI system's directional recommendation: BUY | SELL | HOLD.", examples=["BUY"])
    actual_outcome:   str   = Field(description="Realized market direction: BUY | SELL | HOLD.", examples=["SELL"])

    @field_validator("user_prediction", "ai_prediction", "actual_outcome")
    @classmethod
    def validate_direction(cls, v: str) -> str:
        val = v.upper()
        if val not in {"BUY", "SELL", "HOLD"}:
            raise ValueError(f"Value must be BUY, SELL, or HOLD; received '{v}'.")
        return val

    model_config = {
        "json_schema_extra": {
            "example": {
                "user_prediction": "BUY",
                "user_confidence": 0.9,
                "ai_prediction": "BUY",
                "actual_outcome": "SELL",
            }
        }
    }


class FeedbackReportSchema(BaseModel):
    """Structured post-prediction feedback report."""

    outcome_summary:       str = Field(description="Plain-English outcome statement.")
    confidence_assessment: str = Field(description="Calibration level and score narrative.")
    ai_comparison:         str = Field(description="How the user's prediction compared to the AI.")
    bias_analysis:         str = Field(description="Directional bias assessment.")
    behavioral_insight:    str = Field(description="Behavioral finance insight based on outcome and calibration.")
    improvement_focus:     str = Field(description="Targeted improvement recommendation.")


class BiasDetectionSchema(BaseModel):
    """Bias type and explanation."""

    type:        str = Field(description="OPTIMISTIC | PESSIMISTIC | CALIBRATED | INSUFFICIENT_DATA.")
    explanation: str = Field(description="Narrative explanation of the detected bias.")


class PredictionPlaygroundResponse(BaseModel):
    """Structured evaluation of a user market prediction."""

    user_prediction:   str                  = Field(description="Echoed user prediction.")
    ai_prediction:     str                  = Field(description="Echoed AI prediction.")
    actual_outcome:    str                  = Field(description="Echoed actual outcome.")
    user_confidence:   float                = Field(description="Echoed user confidence.")
    correctness:       str                  = Field(description="CORRECT | INCORRECT.")
    accuracy_score:    float                = Field(description="Binary accuracy score (0.0 or 1.0).")
    calibration_score: float                = Field(description="Brier-style calibration score (0.0–1.0; 1.0 = perfect).")
    calibration_level: str                  = Field(description="WELL_CALIBRATED | OVERCONFIDENT | UNDERCONFIDENT | UNCALIBRATED.")
    bias_detection:    BiasDetectionSchema  = Field(description="Directional bias classification.")
    feedback_report:   FeedbackReportSchema = Field(description="Detailed structured feedback report.")


# ===========================================================================
# 4. Strategy Simulator
# ===========================================================================

class StrategySimulationRequest(BaseModel):
    """Request payload for the investment strategy simulation endpoint."""

    investment_amount:         float = Field(gt=0, description="Principal capital in currency units. Must be positive.", examples=[10000.0])
    predicted_change_percent:  float = Field(ge=-100.0, le=1000.0, description="AI-predicted percentage change in asset value.", examples=[12.5])
    risk_score:                float = Field(ge=0.0, le=1.0, description="Normalized risk exposure score (0.0–1.0).", examples=[0.35])
    volatility_score:          float = Field(ge=0.0, le=1.0, description="Normalized volatility score (0.0–1.0).", examples=[0.40])
    scenario_type:             str   = Field(default="NORMAL", description="Simulation scenario: NORMAL | MARKET_CRASH | HIGH_VOLATILITY.", examples=["NORMAL"])

    @field_validator("scenario_type")
    @classmethod
    def validate_scenario(cls, v: str) -> str:
        val = v.upper()
        if val not in {"NORMAL", "MARKET_CRASH", "HIGH_VOLATILITY"}:
            raise ValueError(f"scenario_type must be NORMAL, MARKET_CRASH, or HIGH_VOLATILITY; received '{v}'.")
        return val

    model_config = {
        "json_schema_extra": {
            "example": {
                "investment_amount": 10000.0,
                "predicted_change_percent": 12.5,
                "risk_score": 0.35,
                "volatility_score": 0.40,
                "scenario_type": "NORMAL",
            }
        }
    }


class StrategySimulationResponse(BaseModel):
    """Projected investment outcomes under the specified scenario."""

    initial_investment:    float = Field(description="Input principal (echoed).")
    projected_value:       float = Field(description="Projected portfolio value after scenario adjustments.")
    projected_profit_loss: float = Field(description="Net profit or loss (projected_value − initial_investment).")
    risk_adjusted_value:   float = Field(description="Projected value discounted by risk exposure.")
    worst_case_projection: float = Field(description="Worst-case capital floor under maximum drawdown assumptions.")
    volatility_impact:     float = Field(description="Monetary cost of variance drag under this scenario.")
    scenario_applied:      str   = Field(description="The scenario that was applied.")
    risk_commentary:       str   = Field(description="Narrative risk assessment for the current parameter set.")
    educational_insight:   str   = Field(description="Financial education insight derived from the simulation outcome.")


# ===========================================================================
# 5. Quiz Submission
# ===========================================================================

class QuizSubmissionRequest(BaseModel):
    """Request payload for submitting a completed quiz session."""

    quiz_id:      str                    = Field(description="Unique identifier for this quiz session.", examples=["quiz_session_001"])
    questions:    list[QuizQuestionSchema] = Field(description="The full question bank subset for this session.", min_length=1)
    user_answers: list[UserAnswerSchema]   = Field(description="User's submitted answers.", min_length=1)

    model_config = {
        "json_schema_extra": {
            "example": {
                "quiz_id": "quiz_session_001",
                "questions": [
                    {
                        "question_id": "q001",
                        "question_text": "An RSI reading of 78 most likely indicates which market condition?",
                        "options": ["Oversold", "Neutral", "Overbought", "Trending"],
                        "correct_option_key": "C",
                        "topic": "RSI",
                        "difficulty": "EASY",
                        "explanation": "RSI above 70 indicates overbought conditions.",
                    }
                ],
                "user_answers": [{"question_id": "q001", "selected_key": "C"}],
            }
        }
    }


class QuizSubmissionResponse(BaseModel):
    """Complete evaluation result for a submitted quiz session."""

    quiz_id:                  str                           = Field(description="Echoed quiz session ID.")
    total_questions:          int                           = Field(description="Total number of questions evaluated.")
    correct_count:            int                           = Field(description="Number of correct answers.")
    incorrect_count:          int                           = Field(description="Number of incorrect or unanswered questions.")
    score_percentage:         float                         = Field(description="Overall score as a percentage (0–100).")
    points_earned:            int                           = Field(description="Gamification points awarded for this session.")
    mastery_level:            str                           = Field(description="BEGINNER | INTERMEDIATE | ADVANCED.")
    topic_performance:        list[TopicPerformanceSchema]  = Field(description="Per-topic accuracy breakdown.")
    question_results:         list[QuestionResultSchema]    = Field(description="Per-question correctness and explanation.")
    learning_recommendations: list[str]                     = Field(description="Targeted study recommendations based on weak topics.")
    motivational_feedback:    str                           = Field(description="Motivational message aligned to mastery level.")


# ===========================================================================
# 6. Streak Status
# ===========================================================================

class StreakStatusRequest(BaseModel):
    """Request payload for evaluating or recording a streak status."""

    current_streak:    int            = Field(ge=0, description="User's current consecutive-day streak.", examples=[6])
    max_streak:        int            = Field(ge=0, description="User's all-time highest streak.", examples=[14])
    last_active_date:  Optional[str]  = Field(
        default=None,
        description="ISO-8601 date string of last activity (YYYY-MM-DD). Null if user has never been active.",
        examples=["2026-02-25"],
    )
    timezone_label:    str            = Field(default="UTC", description="IANA timezone string.", examples=["Asia/Kolkata"])
    grace_period:      bool           = Field(default=False, description="If true, one missed day does not break the streak.")
    record_activity:   bool           = Field(
        default=False,
        description="If true, records a new activity event and returns an update result. If false, returns status only.",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "current_streak": 6,
                "max_streak": 14,
                "last_active_date": "2026-02-25",
                "timezone_label": "Asia/Kolkata",
                "grace_period": True,
                "record_activity": True,
            }
        }
    }


class StreakStateSchema(BaseModel):
    """Snapshot of a user's streak at a point in time."""

    current_streak:    int            = Field(description="Effective current streak count.")
    max_streak:        int            = Field(description="All-time highest streak.")
    last_active_date:  Optional[str]  = Field(description="ISO-8601 last active date or null.")
    is_active_today:   bool           = Field(description="Whether activity has been recorded today.")
    streak_broken:     bool           = Field(description="Whether the streak has lapsed.")
    days_until_expiry: int            = Field(description="Days remaining before the streak expires.")
    timezone_label:    str            = Field(description="Timezone used for date resolution.")


class StreakStatusResponse(BaseModel):
    """
    Streak evaluation response.
    When record_activity=false: contains current_state only.
    When record_activity=true: contains previous_state, updated_state, and transition flags.
    """

    current_state:    Optional[StreakStateSchema] = Field(default=None, description="Current streak state (read-only mode).")
    previous_state:   Optional[StreakStateSchema] = Field(default=None, description="State before recording activity.")
    updated_state:    Optional[StreakStateSchema] = Field(default=None, description="State after recording activity.")
    streak_extended:  Optional[bool]              = Field(default=None, description="True if current_streak increased.")
    streak_reset:     Optional[bool]              = Field(default=None, description="True if streak was broken and restarted at 1.")
    is_new_record:    Optional[bool]              = Field(default=None, description="True if a new max_streak was established.")


# ===========================================================================
# 7. Progress Snapshot
# ===========================================================================

class ProgressSnapshotRequest(BaseModel):
    """Request payload for computing a full user progress snapshot."""

    user_id:             str         = Field(description="Unique user identifier.", examples=["user_42"])
    quizzes_completed:   int         = Field(ge=0, description="Total quizzes completed.", examples=[18])
    quiz_scores:         list[float] = Field(description="Score percentage for each completed quiz (0–100).", examples=[[86.0, 92.0, 78.0]])
    predictions_made:    int         = Field(ge=0, description="Total market predictions submitted.", examples=[35])
    correct_predictions: int         = Field(ge=0, description="Total correct predictions.", examples=[26])
    calibration_scores:  list[float] = Field(description="Per-prediction calibration scores (0.0–1.0).", examples=[[0.82, 0.91, 0.77]])
    current_streak:      int         = Field(ge=0, description="Current consecutive-day streak.", examples=[12])
    max_streak_achieved: int         = Field(ge=0, description="All-time highest streak.", examples=[34])
    total_points:        int         = Field(ge=0, description="Current cumulative points balance.", examples=[0])
    existing_badge_ids:  list[str]   = Field(default_factory=list, description="Badge IDs already awarded (prevents re-award).", examples=[[]])

    @model_validator(mode="after")
    def validate_prediction_counts(self) -> "ProgressSnapshotRequest":
        if self.correct_predictions > self.predictions_made:
            raise ValueError("correct_predictions cannot exceed predictions_made.")
        if self.max_streak_achieved < self.current_streak:
            raise ValueError("max_streak_achieved cannot be less than current_streak.")
        for score in self.quiz_scores:
            if not (0.0 <= score <= 100.0):
                raise ValueError(f"All quiz_scores must be in [0, 100]; received {score}.")
        for cal in self.calibration_scores:
            if not (0.0 <= cal <= 1.0):
                raise ValueError(f"All calibration_scores must be in [0.0, 1.0]; received {cal}.")
        return self

    model_config = {
        "json_schema_extra": {
            "example": {
                "user_id": "user_42",
                "quizzes_completed": 18,
                "quiz_scores": [86.0, 92.0, 78.0, 95.0, 88.0],
                "predictions_made": 35,
                "correct_predictions": 26,
                "calibration_scores": [0.82, 0.91, 0.77, 0.88],
                "current_streak": 12,
                "max_streak_achieved": 34,
                "total_points": 0,
                "existing_badge_ids": [],
            }
        }
    }


class ProgressSnapshotResponse(BaseModel):
    """Complete learning progress snapshot with gamification state."""

    user_id:              str          = Field(description="Echoed user identifier.")
    total_points:         int          = Field(description="Computed total points.")
    level:                str          = Field(description="Current level label (Novice → Elite).")
    badges:               list[BadgeSchema] = Field(description="All earned badges.")
    current_streak:       int          = Field(description="Current streak (echoed).")
    max_streak_achieved:  int          = Field(description="All-time highest streak (echoed).")
    quiz_average:         float        = Field(description="Average quiz score percentage.")
    prediction_accuracy:  float        = Field(description="Prediction accuracy percentage.")
    avg_calibration:      float        = Field(description="Average calibration score (0.0–1.0).")
    engagement_score:     float        = Field(description="Normalized engagement score (0.0–1.0).")
    learning_consistency: str          = Field(description="HIGH | MEDIUM | LOW.")
    skill_maturity:       str          = Field(description="DEVELOPING | COMPETENT | PROFICIENT | EXPERT.")
    points_to_next_level: int          = Field(description="Points required to reach the next level.")
    summary_narrative:    str          = Field(description="Human-readable progress summary.")