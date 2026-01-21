"""Detect temporal vouch bursts."""
from datetime import datetime, timedelta
from collections import defaultdict
import numpy as np
from typing import Optional


def parse_timestamp(ts: str | int | None) -> Optional[datetime]:
    """Parse various timestamp formats."""
    if ts is None:
        return None
    if isinstance(ts, int):
        # Assume milliseconds if large number
        if ts > 10**12:
            return datetime.fromtimestamp(ts / 1000)
        return datetime.fromtimestamp(ts)
    try:
        # Handle ISO format
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def get_vouches_for_profile(vouches: list[dict], profile_id: int) -> list[dict]:
    """Filter vouches received by a specific profile."""
    return [v for v in vouches if v.get("subjectProfileId") == profile_id]


def group_by_window(vouches: list[dict], window_days: int = 7) -> dict[str, list]:
    """Group vouches by time window."""
    windows = defaultdict(list)

    for vouch in vouches:
        # Try different timestamp fields
        ts = None
        for field in ["createdAt", "timestamp"]:
            ts = parse_timestamp(vouch.get(field))
            if ts:
                break

        # Try nested activityCheckpoints
        if not ts and "activityCheckpoints" in vouch:
            checkpoints = vouch["activityCheckpoints"]
            if isinstance(checkpoints, dict):
                ts = parse_timestamp(checkpoints.get("vouched"))

        if ts:
            # Create window key based on week number
            window_key = ts.strftime("%Y-%W")
            windows[window_key].append(vouch)

    return dict(windows)


def detect_vouch_burst(
    vouches: list[dict],
    profile_id: int,
    window_days: int = 7,
    std_threshold: float = 3.0,
) -> tuple[bool, int]:
    """Detect if profile received a burst of vouches.

    Args:
        vouches: All vouch records
        profile_id: Profile to analyze
        window_days: Size of time window
        std_threshold: Standard deviations above mean to flag

    Returns:
        (has_burst, max_burst_size)
    """
    profile_vouches = get_vouches_for_profile(vouches, profile_id)

    if len(profile_vouches) < 10:
        return False, 0

    windows = group_by_window(profile_vouches, window_days)

    if len(windows) < 3:
        return False, 0

    counts = [len(v) for v in windows.values()]
    mean = np.mean(counts)
    std = np.std(counts)

    if std == 0:
        return False, 0

    max_count = max(counts)
    z_score = (max_count - mean) / std

    return z_score > std_threshold, max_count


def calculate_burst_score(vouches: list[dict], profile_id: int) -> float:
    """Calculate burst-based risk score for a profile."""
    has_burst, burst_size = detect_vouch_burst(vouches, profile_id)

    if not has_burst:
        return 0.0

    # Score based on burst size
    if burst_size >= 50:
        return 100.0
    elif burst_size >= 30:
        return 80.0
    elif burst_size >= 20:
        return 60.0
    elif burst_size >= 10:
        return 40.0
    else:
        return 20.0
