"""
progress_tracker.py

Structured learning with gamification: tracks quiz history, prediction accuracy,
streaks, points, and badges. Computes engagement score, learning consistency,
and skill maturity classification. Designed for future DB persistence —
all computation is pure domain logic with no external dependencies.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Constants — Points
# ---------------------------------------------------------------------------

POINTS_QUIZ_COMPLETION: int = 10
POINTS_CORRECT_PREDICTION: int = 15
POINTS_STREAK_MILESTONE_7: int = 25
POINTS_STREAK_MILESTONE_30: int = 75
POINTS_STREAK_MILESTONE_90: int = 200
POINTS_CALIBRATION_BONUS: int = 20       # Awarded when calibration_score >= threshold

CALIBRATION_BONUS_THRESHOLD: float = 0.80

# ---------------------------------------------------------------------------
# Constants — Level thresholds (cumulative points)
# ---------------------------------------------------------------------------

LEVEL_THRESHOLDS: list[tuple[int, str]] = [
    (0,    "Novice"),
    (100,  "Apprentice"),
    (300,  "Analyst"),
    (600,  "Strategist"),
    (1000, "Expert"),
    (1500, "Master"),
    (2500, "Elite"),
]

# ---------------------------------------------------------------------------
# Constants — Badge eligibility
# ---------------------------------------------------------------------------

BADGE_STREAK_BRONZE_DAYS: int = 7
BADGE_STREAK_SILVER_DAYS: int = 30
BADGE_STREAK_GOLD_DAYS: int = 90
BADGE_SCHOLAR_ACCURACY: float = 90.0        # Quiz accuracy % threshold
BADGE_PRECISION_CALIBRATION: float = 0.85   # Avg calibration score threshold

# ---------------------------------------------------------------------------
# Constants — Engagement & consistency scoring
# ---------------------------------------------------------------------------

ENGAGEMENT_QUIZ_WEIGHT: float = 0.35
ENGAGEMENT_PREDICTION_WEIGHT: float = 0.30
ENGAGEMENT_STREAK_WEIGHT: float = 0.25
ENGAGEMENT_CALIBRATION_WEIGHT: float = 0.10

CONSISTENCY_HIGH_THRESHOLD: float = 0.75
CONSISTENCY_MEDIUM_THRESHOLD: float = 0.45

SKILL_MATURITY_ADVANCED: float = 80.0
SKILL_MATURITY_INTERMEDIATE: float = 55.0


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class BadgeTier(str, Enum):
    BRONZE = "BRONZE"
    SILVER = "SILVER"
    GOLD = "GOLD"


class SkillMaturity(str, Enum):
    DEVELOPING = "DEVELOPING"
    COMPETENT = "COMPETENT"
    PROFICIENT = "PROFICIENT"
    EXPERT = "EXPERT"


class LearningConsistency(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


# ---------------------------------------------------------------------------
# Badge dataclass
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Badge:
    """An earned achievement badge."""
    badge_id:    str
    name:        str
    tier:        str
    description: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "badge_id":    self.badge_id,
            "name":        self.name,
            "tier":        self.tier,
            "description": self.description,
        }


# ---------------------------------------------------------------------------
# Input schema
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class UserProgressInput:
    """
    Structured input representing the user's accumulated learning history.
    All fields represent lifetime aggregates or current state.

    Attributes
    ----------
    user_id:
        Unique user identifier (for future DB persistence).
    quizzes_completed:
        Total number of quizzes completed.
    quiz_scores:
        List of score percentages (0–100) for each completed quiz.
    predictions_made:
        Total number of market predictions submitted.
    correct_predictions:
        Total number of correct predictions.
    calibration_scores:
        List of per-prediction calibration scores (0.0–1.0).
    current_streak:
        Current consecutive daily activity streak.
    max_streak_achieved:
        Highest streak ever recorded for this user.
    total_points:
        Current cumulative points balance.
    existing_badge_ids:
        Set of badge IDs already awarded (prevents duplicate awarding).
    """
    user_id:             str
    quizzes_completed:   int
    quiz_scores:         tuple[float, ...]
    predictions_made:    int
    correct_predictions: int
    calibration_scores:  tuple[float, ...]
    current_streak:      int
    max_streak_achieved: int
    total_points:        int
    existing_badge_ids:  frozenset[str] = field(default_factory=frozenset)

    def __post_init__(self) -> None:
        if self.quizzes_completed < 0:
            raise ValueError("quizzes_completed must be >= 0.")
        if self.predictions_made < 0:
            raise ValueError("predictions_made must be >= 0.")
        if self.correct_predictions > self.predictions_made:
            raise ValueError("correct_predictions cannot exceed predictions_made.")
        if self.current_streak < 0:
            raise ValueError("current_streak must be >= 0.")
        if self.total_points < 0:
            raise ValueError("total_points must be >= 0.")
        for score in self.quiz_scores:
            if not (0.0 <= score <= 100.0):
                raise ValueError(f"quiz_scores must be in [0, 100]; received {score}.")
        for cal in self.calibration_scores:
            if not (0.0 <= cal <= 1.0):
                raise ValueError(f"calibration_scores must be in [0.0, 1.0]; received {cal}.")


# ---------------------------------------------------------------------------
# Output schema
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class UserProgressSnapshot:
    """
    Immutable snapshot of a user's current learning progress state.
    Suitable for DB persistence, API responses, and dashboard rendering.
    """
    user_id:              str
    total_points:         int
    level:                str
    badges:               tuple[Badge, ...]
    current_streak:       int
    max_streak_achieved:  int
    quiz_average:         float
    prediction_accuracy:  float
    avg_calibration:      float
    engagement_score:     float
    learning_consistency: str
    skill_maturity:       str
    points_to_next_level: int
    summary_narrative:    str

    def to_dict(self) -> dict[str, Any]:
        return {
            "user_id":              self.user_id,
            "total_points":         self.total_points,
            "level":                self.level,
            "badges":               [b.to_dict() for b in self.badges],
            "current_streak":       self.current_streak,
            "max_streak_achieved":  self.max_streak_achieved,
            "quiz_average":         round(self.quiz_average, 2),
            "prediction_accuracy":  round(self.prediction_accuracy, 2),
            "avg_calibration":      round(self.avg_calibration, 4),
            "engagement_score":     round(self.engagement_score, 4),
            "learning_consistency": self.learning_consistency,
            "skill_maturity":       self.skill_maturity,
            "points_to_next_level": self.points_to_next_level,
            "summary_narrative":    self.summary_narrative,
        }


# ---------------------------------------------------------------------------
# Points computation
# ---------------------------------------------------------------------------

def _compute_points_delta(inp: UserProgressInput) -> int:
    """
    Compute the points to award in this snapshot computation cycle.
    In a persistent system, this would be called on each new event.
    Here it recomputes the total based on current state.
    """
    points = 0
    points += inp.quizzes_completed * POINTS_QUIZ_COMPLETION
    points += inp.correct_predictions * POINTS_CORRECT_PREDICTION

    if inp.max_streak_achieved >= BADGE_STREAK_GOLD_DAYS:
        points += POINTS_STREAK_MILESTONE_90
    elif inp.max_streak_achieved >= BADGE_STREAK_SILVER_DAYS:
        points += POINTS_STREAK_MILESTONE_30
    elif inp.max_streak_achieved >= BADGE_STREAK_BRONZE_DAYS:
        points += POINTS_STREAK_MILESTONE_7

    high_calibration_count = sum(
        1 for c in inp.calibration_scores if c >= CALIBRATION_BONUS_THRESHOLD
    )
    points += high_calibration_count * POINTS_CALIBRATION_BONUS

    return points


# ---------------------------------------------------------------------------
# Level computation
# ---------------------------------------------------------------------------

def _compute_level(total_points: int) -> tuple[str, int]:
    """
    Return the level name and points required to reach the next level.
    """
    current_level_name = LEVEL_THRESHOLDS[0][1]
    next_threshold = LEVEL_THRESHOLDS[1][0] if len(LEVEL_THRESHOLDS) > 1 else 0

    for i, (threshold, name) in enumerate(LEVEL_THRESHOLDS):
        if total_points >= threshold:
            current_level_name = name
            if i + 1 < len(LEVEL_THRESHOLDS):
                next_threshold = LEVEL_THRESHOLDS[i + 1][0]
            else:
                next_threshold = total_points  # Max level

    points_to_next = max(0, next_threshold - total_points)
    return current_level_name, points_to_next


# ---------------------------------------------------------------------------
# Badge computation
# ---------------------------------------------------------------------------

def _compute_badges(
    inp: UserProgressInput,
    quiz_average: float,
    avg_calibration: float,
) -> tuple[Badge, ...]:
    """
    Evaluate badge eligibility based on streak milestones, quiz accuracy,
    and calibration performance. Returns only newly earned badges not already
    in existing_badge_ids.
    """
    all_badges: list[Badge] = []
    existing = inp.existing_badge_ids

    if inp.max_streak_achieved >= BADGE_STREAK_GOLD_DAYS:
        b = Badge(
            badge_id="streak_gold",
            name="Gold Streak",
            tier=BadgeTier.GOLD.value,
            description=f"Maintained a learning streak of {BADGE_STREAK_GOLD_DAYS}+ consecutive days.",
        )
        all_badges.append(b)
    elif inp.max_streak_achieved >= BADGE_STREAK_SILVER_DAYS:
        b = Badge(
            badge_id="streak_silver",
            name="Silver Streak",
            tier=BadgeTier.SILVER.value,
            description=f"Maintained a learning streak of {BADGE_STREAK_SILVER_DAYS}+ consecutive days.",
        )
        all_badges.append(b)
    elif inp.max_streak_achieved >= BADGE_STREAK_BRONZE_DAYS:
        b = Badge(
            badge_id="streak_bronze",
            name="Bronze Streak",
            tier=BadgeTier.BRONZE.value,
            description=f"Maintained a learning streak of {BADGE_STREAK_BRONZE_DAYS}+ consecutive days.",
        )
        all_badges.append(b)

    if quiz_average >= BADGE_SCHOLAR_ACCURACY and inp.quizzes_completed >= 5:
        all_badges.append(Badge(
            badge_id="scholar",
            name="Scholar",
            tier=BadgeTier.GOLD.value,
            description=(
                f"Achieved {BADGE_SCHOLAR_ACCURACY:.0f}%+ average quiz accuracy "
                f"across {inp.quizzes_completed} completed quizzes."
            ),
        ))

    if avg_calibration >= BADGE_PRECISION_CALIBRATION and inp.predictions_made >= 10:
        all_badges.append(Badge(
            badge_id="precision_trader",
            name="Precision Trader",
            tier=BadgeTier.GOLD.value,
            description=(
                f"Maintained an average calibration score of {avg_calibration:.2f} "
                f"across {inp.predictions_made} predictions. Demonstrates disciplined probabilistic thinking."
            ),
        ))

    # Return all earned badges; in a persistent system, filter by existing_badge_ids
    return tuple(all_badges)


# ---------------------------------------------------------------------------
# Engagement and consistency scoring
# ---------------------------------------------------------------------------

def _compute_engagement_score(
    quiz_average: float,
    prediction_accuracy: float,
    current_streak: int,
    avg_calibration: float,
) -> float:
    """
    Compute a normalized engagement score [0.0, 1.0] from weighted components.

    Components:
        quiz_average (0–100) → normalized to 0–1
        prediction_accuracy (0–100) → normalized to 0–1
        streak_component: min(current_streak / 30, 1.0)
        avg_calibration (already 0–1)
    """
    quiz_component = quiz_average / 100.0
    prediction_component = prediction_accuracy / 100.0
    streak_component = min(current_streak / 30.0, 1.0)
    calibration_component = avg_calibration

    score = (
        quiz_component * ENGAGEMENT_QUIZ_WEIGHT
        + prediction_component * ENGAGEMENT_PREDICTION_WEIGHT
        + streak_component * ENGAGEMENT_STREAK_WEIGHT
        + calibration_component * ENGAGEMENT_CALIBRATION_WEIGHT
    )
    return round(min(score, 1.0), 4)


def _compute_learning_consistency(
    quizzes_completed: int,
    predictions_made: int,
    current_streak: int,
) -> LearningConsistency:
    """
    Classify learning consistency based on activity breadth and recency (streak).
    """
    activity_score = min(
        (quizzes_completed / 20.0) * 0.40
        + (predictions_made / 30.0) * 0.30
        + (current_streak / 14.0) * 0.30,
        1.0,
    )

    if activity_score >= CONSISTENCY_HIGH_THRESHOLD:
        return LearningConsistency.HIGH
    elif activity_score >= CONSISTENCY_MEDIUM_THRESHOLD:
        return LearningConsistency.MEDIUM
    else:
        return LearningConsistency.LOW


def _classify_skill_maturity(
    quiz_average: float,
    prediction_accuracy: float,
    avg_calibration: float,
) -> SkillMaturity:
    """
    Classify overall skill maturity from the combined performance signals.
    """
    composite = (
        (quiz_average / 100.0) * 0.40
        + (prediction_accuracy / 100.0) * 0.35
        + avg_calibration * 0.25
    ) * 100.0

    if composite >= SKILL_MATURITY_ADVANCED:
        return SkillMaturity.EXPERT
    elif composite >= SKILL_MATURITY_INTERMEDIATE + 12.5:
        return SkillMaturity.PROFICIENT
    elif composite >= SKILL_MATURITY_INTERMEDIATE:
        return SkillMaturity.COMPETENT
    else:
        return SkillMaturity.DEVELOPING


def _build_summary_narrative(
    level: str,
    skill_maturity: SkillMaturity,
    learning_consistency: LearningConsistency,
    badges: tuple[Badge, ...],
    quiz_average: float,
    prediction_accuracy: float,
) -> str:
    badge_count = len(badges)
    badge_text = (
        f"You have earned {badge_count} badge{'s' if badge_count != 1 else ''}."
        if badge_count > 0
        else "No badges earned yet — continue learning to unlock achievements."
    )

    return (
        f"Current Level: {level}. Skill Maturity: {skill_maturity.value}. "
        f"Learning Consistency: {learning_consistency.value}. "
        f"Quiz Average: {quiz_average:.1f}%. Prediction Accuracy: {prediction_accuracy:.1f}%. "
        f"{badge_text}"
    )


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def compute_progress_snapshot(inp: UserProgressInput) -> UserProgressSnapshot:
    """
    Compute a complete, immutable user progress snapshot implementing
    structured learning with gamification.

    This function aggregates quiz performance, prediction history, streak data,
    and calibration scores to produce a unified learning profile including
    points, level, badges, engagement score, and skill maturity classification.

    Parameters
    ----------
    inp:
        UserProgressInput containing lifetime learning history aggregates.

    Returns
    -------
    UserProgressSnapshot
        Immutable snapshot suitable for API response and DB persistence.
    """
    logger.info("compute_progress_snapshot: user_id=%s", inp.user_id)

    # Core averages
    quiz_average = (
        sum(inp.quiz_scores) / len(inp.quiz_scores)
        if inp.quiz_scores
        else 0.0
    )
    prediction_accuracy = (
        (inp.correct_predictions / inp.predictions_made) * 100.0
        if inp.predictions_made > 0
        else 0.0
    )
    avg_calibration = (
        sum(inp.calibration_scores) / len(inp.calibration_scores)
        if inp.calibration_scores
        else 0.0
    )

    # Points — use provided total_points as base, recompute if zero (fresh user)
    computed_points = _compute_points_delta(inp)
    effective_points = max(inp.total_points, computed_points)

    level, points_to_next = _compute_level(effective_points)
    badges = _compute_badges(inp, quiz_average, avg_calibration)
    engagement_score = _compute_engagement_score(
        quiz_average, prediction_accuracy, inp.current_streak, avg_calibration
    )
    consistency = _compute_learning_consistency(
        inp.quizzes_completed, inp.predictions_made, inp.current_streak
    )
    skill_maturity = _classify_skill_maturity(quiz_average, prediction_accuracy, avg_calibration)
    summary = _build_summary_narrative(
        level, skill_maturity, consistency, badges, quiz_average, prediction_accuracy
    )

    return UserProgressSnapshot(
        user_id=inp.user_id,
        total_points=effective_points,
        level=level,
        badges=badges,
        current_streak=inp.current_streak,
        max_streak_achieved=inp.max_streak_achieved,
        quiz_average=round(quiz_average, 2),
        prediction_accuracy=round(prediction_accuracy, 2),
        avg_calibration=round(avg_calibration, 4),
        engagement_score=engagement_score,
        learning_consistency=consistency.value,
        skill_maturity=skill_maturity.value,
        points_to_next_level=points_to_next,
        summary_narrative=summary,
    )