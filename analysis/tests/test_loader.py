"""Tests for data loader."""
import pytest
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.loader import load_vouches, get_vouch_stats

VOUCHES_PATH = "/Users/kluless/ethos-research/data/raw/vouches.json"


def test_load_vouches_returns_list():
    """Test that load_vouches returns a list."""
    vouches = load_vouches(VOUCHES_PATH)
    assert isinstance(vouches, list)
    assert len(vouches) > 0


def test_vouch_has_required_fields():
    """Test that vouches have required fields."""
    vouches = load_vouches(VOUCHES_PATH)
    vouch = vouches[0]
    assert "authorProfileId" in vouch
    assert "subjectProfileId" in vouch
    assert "balance" in vouch


def test_get_vouch_stats():
    """Test vouch statistics calculation."""
    vouches = load_vouches(VOUCHES_PATH)
    stats = get_vouch_stats(vouches)

    assert stats["total_vouches"] > 0
    assert stats["unique_vouchers"] > 0
    assert stats["unique_subjects"] > 0
    assert stats["unique_profiles"] > 0
