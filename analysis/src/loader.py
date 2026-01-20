"""Load Ethos vouch and market data from JSON files."""
import json
from pathlib import Path
from typing import Any


def load_vouches(path: str | Path) -> list[dict[str, Any]]:
    """Load vouches from JSON file.

    Args:
        path: Path to vouches.json file

    Returns:
        List of vouch records
    """
    with open(path) as f:
        data = json.load(f)

    # Handle nested structure from ethos-research
    if isinstance(data, dict) and "vouches" in data:
        return data["vouches"]
    return data


def load_markets(path: str | Path) -> list[dict[str, Any]]:
    """Load markets from JSON file."""
    with open(path) as f:
        data = json.load(f)

    if isinstance(data, dict) and "markets" in data:
        return data["markets"]
    return data


def get_vouch_stats(vouches: list[dict]) -> dict:
    """Get basic statistics about vouches."""
    unique_authors = set(v["authorProfileId"] for v in vouches)
    unique_subjects = set(v["subjectProfileId"] for v in vouches)

    return {
        "total_vouches": len(vouches),
        "unique_vouchers": len(unique_authors),
        "unique_subjects": len(unique_subjects),
        "unique_profiles": len(unique_authors | unique_subjects),
    }
