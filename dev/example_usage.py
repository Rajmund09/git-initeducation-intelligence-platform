"""
example_usage.py

Demonstrates all Education Intelligence modules through the EducationService
orchestrator. Covers: indicator explainer, AI decision explainer, prediction
playground, streak engine, strategy simulator, quiz engine, progress tracker.
"""

import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date
from education.education_service import EducationService
from education.quiz_engine import QuizQuestion, UserAnswer, TopicTag, DifficultyLevel

service = EducationService()

# ---------------------------------------------------------------------------
# 6. Strategy Simulator
# ---------------------------------------------------------------------------

print("=" * 70)
print("6. STRATEGY SIMULATOR — NORMAL")
print("=" * 70)
normal = service.simulate_strategy(
    investment_amount=10000.0,
    predicted_change_percent=12.5,
    risk_score=0.35,
    volatility_score=0.40,
    scenario_type="NORMAL",
)
print(json.dumps(normal, indent=2))

print("\n--- MARKET CRASH ---")
crash = service.simulate_strategy(
    investment_amount=10000.0,
    predicted_change_percent=12.5,
    risk_score=0.75,
    volatility_score=0.80,
    scenario_type="MARKET_CRASH",
)
print(json.dumps(crash, indent=2))

# ---------------------------------------------------------------------------
# 7. Quiz Engine
# ---------------------------------------------------------------------------

print("\n" + "=" * 70)
print("7. QUIZ ENGINE")
print("=" * 70)

questions = [
    QuizQuestion(
        question_id="q001",
        question_text="An RSI reading of 78 most likely indicates which market condition?",
        options=("Oversold", "Neutral", "Overbought", "Trending"),
        correct_option_key="C",
        topic=TopicTag.RSI,
        difficulty=DifficultyLevel.EASY,
        explanation=(
            "RSI above 70 indicates overbought conditions. A reading of 78 is well into "
            "overbought territory, signaling that buying pressure may be exhausted."
        ),
    ),
    QuizQuestion(
        question_id="q002",
        question_text="Which best describes variance drag?",
        options=(
            "The cost of high transaction fees",
            "The reduction in compounded returns caused by volatility",
            "The delay in moving average signals",
            "The spread between bid and ask prices",
        ),
        correct_option_key="B",
        topic=TopicTag.VOLATILITY,
        difficulty=DifficultyLevel.MEDIUM,
        explanation=(
            "Variance drag is the mathematical reduction in compounded returns caused by volatility. "
            "A 20% gain followed by a 20% loss results in a net -4%, not zero."
        ),
    ),
    QuizQuestion(
        question_id="q003",
        question_text="A risk score of 0.85 should primarily affect which aspect of trade execution?",
        options=(
            "Entry timing only",
            "Position sizing and stop-loss parameters",
            "The direction of the trade",
            "The holding period only",
        ),
        correct_option_key="B",
        topic=TopicTag.RISK,
        difficulty=DifficultyLevel.MEDIUM,
        explanation=(
            "High risk scores signal elevated exposure. The primary response is to reduce "
            "position size and tighten stop-loss parameters."
        ),
    ),
]

user_answers = [
    UserAnswer(question_id="q001", selected_key="C"),
    UserAnswer(question_id="q002", selected_key="A"),
    UserAnswer(question_id="q003", selected_key="B"),
]

quiz_result = service.evaluate_quiz(
    quiz_id="quiz_session_001",
    questions=questions,
    user_answers=user_answers,
)
print(json.dumps(quiz_result, indent=2))

# ---------------------------------------------------------------------------
# 8. Progress Tracker
# ---------------------------------------------------------------------------

print("\n" + "=" * 70)
print("8. PROGRESS TRACKER")
print("=" * 70)

progress = service.compute_progress_snapshot(
    user_id="user_42",
    quizzes_completed=18,
    quiz_scores=[72.0, 80.0, 85.0, 90.0, 88.0, 76.0, 92.0, 95.0,
                 84.0, 78.0, 88.0, 91.0, 87.0, 93.0, 82.0, 89.0, 94.0, 96.0],
    predictions_made=35,
    correct_predictions=26,
    calibration_scores=[
        0.72, 0.81, 0.68, 0.90, 0.85, 0.77, 0.88, 0.92,
        0.70, 0.83, 0.87, 0.91, 0.79, 0.86, 0.93,
    ],
    current_streak=12,
    max_streak_achieved=34,
    total_points=0,
    existing_badge_ids=[],
)
print(json.dumps(progress, indent=2))