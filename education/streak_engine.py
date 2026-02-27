"""
streak_engine.py

Production-grade engagement streak engine with timezone-aware date handling
and optional one-day grace period. Designed for safe, concurrent use via
the immutable StreakState pattern.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date, timedelta, timezone
from typing import Any, Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEFAULT_TIMEZONE = "UTC"
GRACE_PERIOD_DAYS = 1


# ---------------------------------------------------------------------------
# Domain types
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class StreakState:
    """
    Immutable snapshot of a user's streak status.
    Consumers must replace the entire state object on each update — no mutation.
    """
    current_streak:    int
    max_streak:        int
    last_active_date:  Optional[date]   # None when the user has never been active
    is_active_today:   bool
    streak_broken:     bool
    days_until_expiry: int              # 0 when expiry is today, negative when broken
    timezone_label:    str

    def to_dict(self) -> dict[str, Any]:
        return {
            "current_streak":    self.current_streak,
            "max_streak":        self.max_streak,
            "last_active_date":  self.last_active_date.isoformat() if self.last_active_date else None,
            "is_active_today":   self.is_active_today,
            "streak_broken":     self.streak_broken,
            "days_until_expiry": self.days_until_expiry,
            "timezone_label":    self.timezone_label,
        }


@dataclass(frozen=True)
class StreakUpdateResult:
    """Result returned after recording a new activity event."""
    previous_state: StreakState
    updated_state:  StreakState
    streak_extended: bool    # True if current_streak increased
    streak_reset:    bool    # True if streak was broken and restarted from 1
    is_new_record:   bool    # True if new max_streak established

    def to_dict(self) -> dict[str, Any]:
        return {
            "previous_state":  self.previous_state.to_dict(),
            "updated_state":   self.updated_state.to_dict(),
            "streak_extended": self.streak_extended,
            "streak_reset":    self.streak_reset,
            "is_new_record":   self.is_new_record,
        }


# ---------------------------------------------------------------------------
# Timezone helpers
# ---------------------------------------------------------------------------

def _resolve_timezone(tz_label: str) -> ZoneInfo:
    """
    Resolve a timezone label to a ZoneInfo object.
    Falls back to UTC on invalid labels with a logged warning.
    """
    try:
        return ZoneInfo(tz_label)
    except (ZoneInfoNotFoundError, KeyError):
        logger.warning(
            "Unrecognised timezone '%s'; falling back to UTC.", tz_label
        )
        return ZoneInfo(DEFAULT_TIMEZONE)


def _today_in_tz(tz_label: str) -> date:
    """Return the current date in the specified timezone."""
    from datetime import datetime
    tz = _resolve_timezone(tz_label)
    return datetime.now(tz=tz).date()


# ---------------------------------------------------------------------------
# Core streak logic
# ---------------------------------------------------------------------------

def _classify_date_gap(
    last_active: Optional[date],
    today: date,
    grace_period: bool,
) -> str:
    """
    Classify the gap between last active date and today.

    Returns one of:
        "active_today"    - user already active today
        "consecutive"     - activity is on the next calendar day
        "grace"           - one day gap, within grace period
        "broken"          - gap exceeds allowed tolerance
        "first_activity"  - no prior activity recorded
    """
    if last_active is None:
        return "first_activity"

    delta = (today - last_active).days

    if delta == 0:
        return "active_today"
    elif delta == 1:
        return "consecutive"
    elif delta == 2 and grace_period:
        return "grace"
    else:
        return "broken"


def _compute_days_until_expiry(
    last_active: Optional[date],
    today: date,
    grace_period: bool,
) -> int:
    """
    Compute how many days remain before the streak expires.

    Positive → streak safe for that many more days.
    Zero     → must be active today to preserve streak.
    Negative → streak already broken by this many days.
    """
    if last_active is None:
        return 0

    allowed_gap = (GRACE_PERIOD_DAYS + 1) if grace_period else 1
    latest_allowed = last_active + timedelta(days=allowed_gap)
    return (latest_allowed - today).days


def evaluate_streak_status(
    current_streak: int,
    max_streak: int,
    last_active_date: Optional[date],
    timezone_label: str = DEFAULT_TIMEZONE,
    grace_period: bool = False,
) -> StreakState:
    """
    Evaluate the current streak status without recording new activity.
    Use this for display purposes (e.g., dashboard rendering).

    Parameters
    ----------
    current_streak:
        User's current consecutive-day streak count.
    max_streak:
        User's all-time highest streak count.
    last_active_date:
        The last calendar date on which activity was recorded. None if never active.
    timezone_label:
        IANA timezone string (e.g., 'America/New_York', 'Asia/Kolkata').
    grace_period:
        If True, a single missed day does not break the streak.

    Returns
    -------
    StreakState
        Immutable snapshot of the current streak evaluation.
    """
    if current_streak < 0:
        raise ValueError(f"current_streak must be >= 0; received {current_streak}.")
    if max_streak < 0:
        raise ValueError(f"max_streak must be >= 0; received {max_streak}.")
    if max_streak < current_streak:
        raise ValueError(
            f"max_streak ({max_streak}) cannot be less than current_streak ({current_streak})."
        )

    today = _today_in_tz(timezone_label)
    classification = _classify_date_gap(last_active_date, today, grace_period)
    days_until_expiry = _compute_days_until_expiry(last_active_date, today, grace_period)

    is_active_today = classification == "active_today"
    streak_broken = classification == "broken"

    effective_streak = 0 if streak_broken else current_streak

    logger.debug(
        "Streak status: classification=%s current=%d max=%d today=%s last_active=%s",
        classification,
        effective_streak,
        max_streak,
        today.isoformat(),
        last_active_date.isoformat() if last_active_date else "None",
    )

    return StreakState(
        current_streak=effective_streak,
        max_streak=max_streak,
        last_active_date=last_active_date,
        is_active_today=is_active_today,
        streak_broken=streak_broken,
        days_until_expiry=days_until_expiry,
        timezone_label=timezone_label,
    )


def record_activity(
    current_streak: int,
    max_streak: int,
    last_active_date: Optional[date],
    timezone_label: str = DEFAULT_TIMEZONE,
    grace_period: bool = False,
) -> StreakUpdateResult:
    """
    Record a user activity event and compute the updated streak state.

    This function is idempotent for same-day calls: calling it multiple times
    on the same calendar day will not increment the streak beyond once.

    Parameters
    ----------
    current_streak:
        User's current streak count before this activity event.
    max_streak:
        User's all-time highest streak count.
    last_active_date:
        The last calendar date on which activity was recorded. None if never active.
    timezone_label:
        IANA timezone string.
    grace_period:
        If True, a single missed day does not break the streak.

    Returns
    -------
    StreakUpdateResult
        Contains both previous and updated StreakState, plus transition metadata.
    """
    previous_state = evaluate_streak_status(
        current_streak=current_streak,
        max_streak=max_streak,
        last_active_date=last_active_date,
        timezone_label=timezone_label,
        grace_period=grace_period,
    )

    today = _today_in_tz(timezone_label)
    classification = _classify_date_gap(last_active_date, today, grace_period)

    streak_reset = False
    streak_extended = False
    new_current_streak: int
    new_max_streak: int = max_streak

    if classification == "active_today":
        # Idempotent: no change
        new_current_streak = current_streak
        logger.debug("Activity already recorded today; streak unchanged at %d.", current_streak)

    elif classification in ("consecutive", "grace", "first_activity"):
        new_current_streak = (current_streak if classification != "broken" else 0) + 1
        streak_extended = True
        if new_current_streak > max_streak:
            new_max_streak = new_current_streak
        logger.debug(
            "Streak extended: %d → %d (classification=%s)",
            current_streak,
            new_current_streak,
            classification,
        )

    else:  # broken
        new_current_streak = 1
        streak_reset = True
        logger.info(
            "Streak broken and reset to 1. Previous streak: %d, last active: %s",
            current_streak,
            last_active_date.isoformat() if last_active_date else "None",
        )

    is_new_record = new_current_streak > max_streak

    days_until_expiry = _compute_days_until_expiry(today, today, grace_period)

    updated_state = StreakState(
        current_streak=new_current_streak,
        max_streak=new_max_streak,
        last_active_date=today,
        is_active_today=True,
        streak_broken=False,
        days_until_expiry=1 + (GRACE_PERIOD_DAYS if grace_period else 0),
        timezone_label=timezone_label,
    )

    return StreakUpdateResult(
        previous_state=previous_state,
        updated_state=updated_state,
        streak_extended=streak_extended,
        streak_reset=streak_reset,
        is_new_record=is_new_record,
    )