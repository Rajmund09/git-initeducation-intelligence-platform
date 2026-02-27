"""
quiz_engine.py

Structured learning quiz engine with gamification, topic-level performance
breakdown, mastery classification, and educational commentary for incorrect
answers. Designed for DB persistence (no DB code present — pure domain logic).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MASTERY_THRESHOLDS = {
    "BEGINNER":     60.0,
    "INTERMEDIATE": 80.0,
}

POINTS_PER_CORRECT: int = 10
TOPIC_WEAK_THRESHOLD: float = 50.0
TOPIC_STRONG_THRESHOLD: float = 80.0

MOTIVATIONAL_FEEDBACK = {
    "ADVANCED": (
        "Exceptional performance. Your understanding of financial concepts is at an advanced level. "
        "Continue challenging yourself with complex multi-indicator scenarios."
    ),
    "INTERMEDIATE": (
        "Solid performance. You have a working understanding of core concepts. "
        "Review the topics where accuracy fell below 80% to consolidate your knowledge."
    ),
    "BEGINNER": (
        "Good start. Focus on foundational concepts before advancing to complex strategies. "
        "Revisiting incorrect answers is the fastest path to mastery."
    ),
}


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class TopicTag(str, Enum):
    RSI = "RSI"
    VOLATILITY = "VOLATILITY"
    RISK = "RISK"
    DIVERSIFICATION = "DIVERSIFICATION"
    SENTIMENT = "SENTIMENT"
    EMA = "EMA"
    SMA = "SMA"
    VOLUME = "VOLUME"
    GENERAL = "GENERAL"


class DifficultyLevel(str, Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"


class MasteryLevel(str, Enum):
    BEGINNER = "BEGINNER"
    INTERMEDIATE = "INTERMEDIATE"
    ADVANCED = "ADVANCED"


# ---------------------------------------------------------------------------
# Question and Answer schemas
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class QuizQuestion:
    """
    A single quiz question with deterministic correct answer and educational commentary.
    Designed to be stored and retrieved from a DB question bank.
    """
    question_id:        str
    question_text:      str
    options:            tuple[str, ...]          # Ordered answer options (A, B, C, D)
    correct_option_key: str                      # "A" | "B" | "C" | "D"
    topic:              TopicTag
    difficulty:         DifficultyLevel
    explanation:        str                      # Shown when answer is incorrect


@dataclass(frozen=True)
class UserAnswer:
    """A single user answer for one question."""
    question_id:    str
    selected_key:   str          # "A" | "B" | "C" | "D"
    time_taken_sec: Optional[int] = None


# ---------------------------------------------------------------------------
# Result dataclasses
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class QuestionResult:
    """Evaluation result for a single question."""
    question_id:    str
    topic:          str
    difficulty:     str
    is_correct:     bool
    selected_key:   str
    correct_key:    str
    explanation:    str          # Empty string if correct; populated if incorrect


@dataclass(frozen=True)
class TopicPerformance:
    """Aggregated performance for a single topic."""
    topic:            str
    attempted:        int
    correct:          int
    accuracy_percent: float
    performance_band: str        # STRONG | DEVELOPING | WEAK


@dataclass(frozen=True)
class QuizResult:
    """
    Complete, immutable result of a quiz evaluation session.
    Structured for DB persistence and FastAPI serialization.
    """
    quiz_id:                 str
    total_questions:         int
    correct_count:           int
    incorrect_count:         int
    score_percentage:        float
    points_earned:           int
    mastery_level:           str
    topic_performance:       tuple[TopicPerformance, ...]
    question_results:        tuple[QuestionResult, ...]
    learning_recommendations: tuple[str, ...]
    motivational_feedback:   str

    def to_dict(self) -> dict[str, Any]:
        return {
            "quiz_id":                  self.quiz_id,
            "total_questions":          self.total_questions,
            "correct_count":            self.correct_count,
            "incorrect_count":          self.incorrect_count,
            "score_percentage":         round(self.score_percentage, 2),
            "points_earned":            self.points_earned,
            "mastery_level":            self.mastery_level,
            "topic_performance":        [
                {
                    "topic":            tp.topic,
                    "attempted":        tp.attempted,
                    "correct":          tp.correct,
                    "accuracy_percent": round(tp.accuracy_percent, 2),
                    "performance_band": tp.performance_band,
                }
                for tp in self.topic_performance
            ],
            "question_results":         [
                {
                    "question_id":  qr.question_id,
                    "topic":        qr.topic,
                    "difficulty":   qr.difficulty,
                    "is_correct":   qr.is_correct,
                    "selected_key": qr.selected_key,
                    "correct_key":  qr.correct_key,
                    "explanation":  qr.explanation,
                }
                for qr in self.question_results
            ],
            "learning_recommendations": list(self.learning_recommendations),
            "motivational_feedback":    self.motivational_feedback,
        }


# ---------------------------------------------------------------------------
# Core evaluation logic
# ---------------------------------------------------------------------------

def _classify_mastery(score_pct: float) -> MasteryLevel:
    if score_pct >= MASTERY_THRESHOLDS["INTERMEDIATE"]:
        return MasteryLevel.ADVANCED
    elif score_pct >= MASTERY_THRESHOLDS["BEGINNER"]:
        return MasteryLevel.INTERMEDIATE
    else:
        return MasteryLevel.BEGINNER


def _classify_topic_band(accuracy_pct: float) -> str:
    if accuracy_pct >= TOPIC_STRONG_THRESHOLD:
        return "STRONG"
    elif accuracy_pct >= TOPIC_WEAK_THRESHOLD:
        return "DEVELOPING"
    else:
        return "WEAK"


def _compute_topic_performance(
    question_results: list[QuestionResult],
) -> tuple[TopicPerformance, ...]:
    topic_map: dict[str, dict[str, int]] = {}

    for qr in question_results:
        if qr.topic not in topic_map:
            topic_map[qr.topic] = {"attempted": 0, "correct": 0}
        topic_map[qr.topic]["attempted"] += 1
        if qr.is_correct:
            topic_map[qr.topic]["correct"] += 1

    performances: list[TopicPerformance] = []
    for topic, counts in sorted(topic_map.items()):
        attempted = counts["attempted"]
        correct = counts["correct"]
        accuracy = (correct / attempted * 100.0) if attempted > 0 else 0.0
        performances.append(TopicPerformance(
            topic=topic,
            attempted=attempted,
            correct=correct,
            accuracy_percent=accuracy,
            performance_band=_classify_topic_band(accuracy),
        ))

    return tuple(performances)


def _build_recommendations(
    topic_performances: tuple[TopicPerformance, ...],
    mastery_level: MasteryLevel,
) -> tuple[str, ...]:
    recommendations: list[str] = []

    weak_topics = [tp for tp in topic_performances if tp.performance_band == "WEAK"]
    developing_topics = [tp for tp in topic_performances if tp.performance_band == "DEVELOPING"]

    for tp in weak_topics:
        recommendations.append(
            f"Priority review required: {tp.topic}. "
            f"Accuracy of {tp.accuracy_percent:.0f}% indicates foundational gaps. "
            f"Study the definition, thresholds, and practical use cases for {tp.topic} before retaking this section."
        )

    for tp in developing_topics:
        recommendations.append(
            f"Consolidation needed: {tp.topic}. "
            f"Accuracy of {tp.accuracy_percent:.0f}% suggests partial understanding. "
            f"Focus on edge cases and scenario-based application of {tp.topic}."
        )

    if mastery_level == MasteryLevel.ADVANCED and not weak_topics and not developing_topics:
        recommendations.append(
            "All topics are in the STRONG band. "
            "Advance to multi-indicator strategy simulations and portfolio-level analysis exercises."
        )

    if not recommendations:
        recommendations.append(
            "Continue with the next difficulty tier to build on your current performance."
        )

    return tuple(recommendations)


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def evaluate_quiz(
    quiz_id: str,
    questions: list[QuizQuestion],
    user_answers: list[UserAnswer],
) -> QuizResult:
    """
    Evaluate a completed quiz session and return a structured, immutable result.

    Parameters
    ----------
    quiz_id:
        Unique identifier for this quiz session (UUID recommended).
    questions:
        Ordered list of QuizQuestion objects representing the question bank subset.
    user_answers:
        List of UserAnswer objects submitted by the user.

    Returns
    -------
    QuizResult
        Immutable result with scores, mastery classification, topic breakdown,
        and learning recommendations.

    Raises
    ------
    ValueError
        If user_answers contains a question_id not present in questions.
    """
    if not questions:
        raise ValueError("questions list must not be empty.")

    question_map: dict[str, QuizQuestion] = {q.question_id: q for q in questions}
    answer_map: dict[str, UserAnswer] = {a.question_id: a for a in user_answers}

    for answer in user_answers:
        if answer.question_id not in question_map:
            raise ValueError(
                f"UserAnswer references unknown question_id '{answer.question_id}'."
            )

    logger.info("evaluate_quiz: quiz_id=%s questions=%d", quiz_id, len(questions))

    question_results: list[QuestionResult] = []

    for question in questions:
        user_answer = answer_map.get(question.question_id)

        if user_answer is None:
            selected_key = "UNANSWERED"
            is_correct = False
            explanation = (
                f"This question was not answered. "
                f"Correct answer: {question.correct_option_key}. {question.explanation}"
            )
        else:
            selected_key = user_answer.selected_key.upper()
            is_correct = selected_key == question.correct_option_key.upper()
            explanation = "" if is_correct else question.explanation

        question_results.append(QuestionResult(
            question_id=question.question_id,
            topic=question.topic.value,
            difficulty=question.difficulty.value,
            is_correct=is_correct,
            selected_key=selected_key,
            correct_key=question.correct_option_key,
            explanation=explanation,
        ))

    correct_count = sum(1 for qr in question_results if qr.is_correct)
    incorrect_count = len(question_results) - correct_count
    score_pct = (correct_count / len(question_results)) * 100.0 if question_results else 0.0
    points_earned = correct_count * POINTS_PER_CORRECT
    mastery_level = _classify_mastery(score_pct)
    topic_performance = _compute_topic_performance(question_results)
    recommendations = _build_recommendations(topic_performance, mastery_level)
    motivational_feedback = MOTIVATIONAL_FEEDBACK[mastery_level.value]

    return QuizResult(
        quiz_id=quiz_id,
        total_questions=len(question_results),
        correct_count=correct_count,
        incorrect_count=incorrect_count,
        score_percentage=score_pct,
        points_earned=points_earned,
        mastery_level=mastery_level.value,
        topic_performance=topic_performance,
        question_results=tuple(question_results),
        learning_recommendations=recommendations,
        motivational_feedback=motivational_feedback,
    )