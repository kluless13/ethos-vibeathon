"""Tests for risk scoring."""

import pytest
import networkx as nx
from datetime import datetime, timedelta

from src.scorer import (
    calculate_risk_score,
    analyze_all_profiles,
    get_high_risk_profiles,
    get_network_summary,
    get_risk_level,
    RiskBreakdown,
    DEFAULT_WEIGHTS,
)


def test_get_risk_level_critical():
    """Score >= 70 is critical."""
    assert get_risk_level(70) == "critical"
    assert get_risk_level(100) == "critical"


def test_get_risk_level_high():
    """Score 50-69 is high."""
    assert get_risk_level(50) == "high"
    assert get_risk_level(69) == "high"


def test_get_risk_level_medium():
    """Score 30-49 is medium."""
    assert get_risk_level(30) == "medium"
    assert get_risk_level(49) == "medium"


def test_get_risk_level_low():
    """Score 10-29 is low."""
    assert get_risk_level(10) == "low"
    assert get_risk_level(29) == "low"


def test_get_risk_level_minimal():
    """Score < 10 is minimal."""
    assert get_risk_level(0) == "minimal"
    assert get_risk_level(9) == "minimal"


def test_calculate_risk_score_clean_profile():
    """Clean profile with no suspicious activity gets low score."""
    G = nx.DiGraph()
    # Simple star pattern - one popular profile
    for i in range(2, 7):
        G.add_edge(i, 1, weight=0.5)
        G.add_edge(1, i + 10, weight=0.5)  # Profile 1 also gives back

    vouches = [
        {"subjectProfileId": 1, "authorProfileId": i, "createdAt": "2024-01-01"}
        for i in range(2, 7)
    ]

    breakdown = calculate_risk_score(G, profile_id=1, vouches=vouches)

    assert breakdown.composite_score < 30
    assert breakdown.risk_level in ["minimal", "low"]


def test_calculate_risk_score_ring_member():
    """Profile in a ring gets higher score."""
    G = nx.DiGraph()
    # Triangle ring
    G.add_edges_from([(1, 2), (2, 3), (3, 1)], weight=0.5)

    vouches = [
        {"subjectProfileId": 1, "authorProfileId": 3, "createdAt": "2024-01-01"},
        {"subjectProfileId": 2, "authorProfileId": 1, "createdAt": "2024-01-01"},
        {"subjectProfileId": 3, "authorProfileId": 2, "createdAt": "2024-01-01"},
    ]

    breakdown = calculate_risk_score(G, profile_id=1, vouches=vouches)

    # Should have ring score of 40 (3-node ring)
    assert breakdown.ring_score == 40.0
    # Composite should be significant
    assert breakdown.composite_score >= 10


def test_risk_breakdown_to_dict():
    """RiskBreakdown converts to dict correctly."""
    breakdown = RiskBreakdown(
        ring_score=40.0,
        cluster_score=20.0,
        burst_score=0.0,
        stake_score=10.0,
        reciprocity_score=5.0,
        composite_score=25.5,
        risk_level="low",
    )

    d = breakdown.to_dict()

    assert d["ring_score"] == 40.0
    assert d["composite_score"] == 25.5
    assert d["risk_level"] == "low"


def test_analyze_all_profiles():
    """Analyze all profiles in graph."""
    G = nx.DiGraph()
    G.add_edges_from([(1, 2), (2, 3), (3, 1)], weight=0.5)
    G.add_edge(4, 1, weight=0.5)  # External node

    vouches = [
        {"subjectProfileId": 1, "authorProfileId": 3, "createdAt": "2024-01-01"},
        {"subjectProfileId": 2, "authorProfileId": 1, "createdAt": "2024-01-01"},
        {"subjectProfileId": 3, "authorProfileId": 2, "createdAt": "2024-01-01"},
        {"subjectProfileId": 1, "authorProfileId": 4, "createdAt": "2024-01-01"},
    ]

    results = analyze_all_profiles(G, vouches)

    assert len(results) == 4  # All 4 profiles analyzed
    # Results should be sorted by score descending
    assert results[0]["composite_score"] >= results[-1]["composite_score"]


def test_get_high_risk_profiles():
    """Filter high risk profiles."""
    results = [
        {"profile_id": 1, "composite_score": 80.0, "risk_level": "critical"},
        {"profile_id": 2, "composite_score": 50.0, "risk_level": "high"},
        {"profile_id": 3, "composite_score": 20.0, "risk_level": "low"},
        {"profile_id": 4, "composite_score": 5.0, "risk_level": "minimal"},
    ]

    high_risk = get_high_risk_profiles(results, threshold=30.0)

    assert len(high_risk) == 2
    assert high_risk[0]["profile_id"] == 1
    assert high_risk[1]["profile_id"] == 2


def test_get_network_summary():
    """Generate network summary."""
    G = nx.DiGraph()
    G.add_edges_from([(1, 2), (2, 3), (3, 1), (4, 1)], weight=0.5)

    results = [
        {"profile_id": 1, "composite_score": 80.0, "risk_level": "critical"},
        {"profile_id": 2, "composite_score": 50.0, "risk_level": "high"},
        {"profile_id": 3, "composite_score": 20.0, "risk_level": "low"},
        {"profile_id": 4, "composite_score": 5.0, "risk_level": "minimal"},
    ]

    summary = get_network_summary(G, results)

    assert summary["total_profiles"] == 4
    assert summary["total_vouches"] == 4
    assert summary["risk_distribution"]["critical"] == 1
    assert summary["risk_distribution"]["high"] == 1
    assert summary["avg_risk_score"] == 38.75


def test_default_weights_sum_to_one():
    """Verify default weights sum to 1.0."""
    total = sum(DEFAULT_WEIGHTS.values())
    assert abs(total - 1.0) < 0.001


def test_custom_weights():
    """Can use custom weights."""
    G = nx.DiGraph()
    G.add_edges_from([(1, 2), (2, 3), (3, 1)], weight=0.5)

    vouches = [
        {"subjectProfileId": 1, "authorProfileId": 3, "createdAt": "2024-01-01"},
    ]

    # Custom weights that heavily weight rings
    custom_weights = {
        "ring": 0.80,
        "cluster": 0.05,
        "burst": 0.05,
        "stake": 0.05,
        "reciprocity": 0.05,
    }

    breakdown = calculate_risk_score(
        G, profile_id=1, vouches=vouches, weights=custom_weights
    )

    # Ring score is 40, with 0.8 weight = 32
    assert breakdown.composite_score >= 30
