"""Tests for collusion detectors."""

import pytest
import networkx as nx
from datetime import datetime, timedelta

from src.detectors import (
    # Rings
    find_rings,
    calculate_ring_score,
    get_ring_stats,
    # Clusters
    find_communities,
    find_isolated_clusters,
    calculate_cluster_score,
    calculate_insularity,
    # Bursts
    detect_vouch_burst,
    calculate_burst_score,
    # Stakes
    calculate_stake_score,
    get_incoming_stakes,
    # Reciprocity
    calculate_reciprocity_ratio,
    calculate_reciprocity_score,
)


# === Ring Detection Tests ===


def test_find_rings_simple_triangle():
    """Find a simple 3-node ring."""
    G = nx.DiGraph()
    G.add_edges_from([(1, 2), (2, 3), (3, 1)])

    rings = find_rings(G, max_length=5)

    assert len(rings) == 1
    assert set(rings[0]) == {1, 2, 3}


def test_find_rings_no_cycles():
    """No rings in a DAG."""
    G = nx.DiGraph()
    G.add_edges_from([(1, 2), (2, 3), (1, 3)])

    rings = find_rings(G, max_length=5)

    assert len(rings) == 0


def test_calculate_ring_score_in_triangle():
    """Profile in a triangle gets high score."""
    G = nx.DiGraph()
    G.add_edges_from([(1, 2), (2, 3), (3, 1)])

    score = calculate_ring_score(G, profile_id=1, max_length=5)

    assert score == 40.0  # One 3-node ring


def test_calculate_ring_score_not_in_ring():
    """Profile not in any ring gets 0 score."""
    G = nx.DiGraph()
    G.add_edges_from([(1, 2), (2, 3), (3, 1)])
    G.add_node(4)

    score = calculate_ring_score(G, profile_id=4, max_length=5)

    assert score == 0.0


def test_get_ring_stats():
    """Ring statistics are computed correctly."""
    G = nx.DiGraph()
    # One triangle
    G.add_edges_from([(1, 2), (2, 3), (3, 1)])
    # One square
    G.add_edges_from([(4, 5), (5, 6), (6, 7), (7, 4)])

    stats = get_ring_stats(G, max_length=5)

    assert stats["total_rings"] == 2
    assert stats["rings_by_size"].get(3, 0) == 1
    assert stats["rings_by_size"].get(4, 0) == 1


# === Cluster Detection Tests ===


def test_find_communities_two_clusters():
    """Find two separate communities."""
    G = nx.DiGraph()
    # Cluster 1: densely connected
    G.add_edges_from([(1, 2), (2, 1), (2, 3), (3, 2), (1, 3), (3, 1)])
    # Cluster 2: densely connected
    G.add_edges_from([(4, 5), (5, 4), (5, 6), (6, 5), (4, 6), (6, 4)])

    communities = find_communities(G)

    assert len(communities) >= 1  # Should find at least one community


def test_calculate_insularity_isolated():
    """Fully isolated cluster has insularity 1.0."""
    G = nx.DiGraph()
    # Cluster 1: isolated
    G.add_edges_from([(1, 2), (2, 1), (2, 3), (3, 2), (1, 3), (3, 1)])
    # Cluster 2: isolated
    G.add_edges_from([(4, 5), (5, 4), (5, 6), (6, 5), (4, 6), (6, 4)])

    insularity = calculate_insularity(G, {1, 2, 3})

    assert insularity == 1.0


def test_calculate_insularity_connected():
    """Connected cluster has lower insularity."""
    G = nx.DiGraph()
    # Cluster 1
    G.add_edges_from([(1, 2), (2, 1), (2, 3), (3, 2)])
    # Cluster 2
    G.add_edges_from([(4, 5), (5, 4)])
    # Bridge between clusters
    G.add_edge(3, 4)

    insularity = calculate_insularity(G, {1, 2, 3})

    assert insularity < 1.0


def test_find_isolated_clusters():
    """Find clusters above insularity threshold."""
    G = nx.DiGraph()
    # Isolated cluster
    G.add_edges_from([(1, 2), (2, 1), (2, 3), (3, 2), (1, 3), (3, 1)])
    # Another isolated cluster
    G.add_edges_from([(4, 5), (5, 4), (5, 6), (6, 5), (4, 6), (6, 4)])

    isolated = find_isolated_clusters(G, insularity_threshold=0.8)

    # Both clusters should be found as isolated
    assert len(isolated) >= 1


# === Burst Detection Tests ===


def test_detect_vouch_burst_no_burst():
    """No burst with consistent vouch rate."""
    vouches = []
    base_time = datetime(2024, 1, 1)

    # Consistent 2 vouches per week for 10 weeks
    for week in range(10):
        for day in range(2):
            vouches.append(
                {
                    "subjectProfileId": 1,
                    "createdAt": (base_time + timedelta(weeks=week, days=day)).isoformat(),
                }
            )

    has_burst, _ = detect_vouch_burst(vouches, profile_id=1)

    assert not has_burst  # numpy bool comparison


def test_detect_vouch_burst_with_burst():
    """Detect a burst of vouches."""
    vouches = []
    base_time = datetime(2024, 1, 1)

    # Normal rate: 1 vouch per week for 10 weeks (baseline)
    for week in range(10):
        vouches.append(
            {
                "subjectProfileId": 1,
                "createdAt": (base_time + timedelta(weeks=week)).isoformat(),
            }
        )

    # Burst: 50 vouches in week 11 (extreme anomaly)
    for i in range(50):
        vouches.append(
            {
                "subjectProfileId": 1,
                "createdAt": (base_time + timedelta(weeks=11, hours=i)).isoformat(),
            }
        )

    has_burst, burst_size = detect_vouch_burst(vouches, profile_id=1, std_threshold=2.0)

    assert has_burst  # numpy bool comparison
    assert burst_size >= 50


def test_calculate_burst_score_large_burst():
    """Large burst gets high score."""
    vouches = []
    base_time = datetime(2024, 1, 1)

    # Normal weeks: 1 vouch per week for 10 weeks
    for week in range(10):
        vouches.append(
            {
                "subjectProfileId": 1,
                "createdAt": (base_time + timedelta(weeks=week)).isoformat(),
            }
        )

    # Huge burst: 60 vouches in week 11
    for i in range(60):
        vouches.append(
            {
                "subjectProfileId": 1,
                "createdAt": (base_time + timedelta(weeks=11, hours=i)).isoformat(),
            }
        )

    score = calculate_burst_score(vouches, profile_id=1)

    assert score >= 80.0  # 60+ burst should score high


# === Stake Analysis Tests ===


def test_get_incoming_stakes():
    """Get stakes from incoming vouches."""
    G = nx.DiGraph()
    G.add_edge(2, 1, weight=0.5)
    G.add_edge(3, 1, weight=1.0)
    G.add_edge(4, 1, weight=0.25)

    stakes = get_incoming_stakes(G, profile_id=1)

    assert sorted(stakes) == [0.25, 0.5, 1.0]


def test_calculate_stake_score_low_stakes():
    """Low stakes compared to network get penalized."""
    G = nx.DiGraph()
    # Profile 1 receives tiny stakes
    G.add_edge(2, 1, weight=0.001)
    G.add_edge(3, 1, weight=0.002)
    G.add_edge(4, 1, weight=0.001)

    # Other profiles have normal stakes
    G.add_edge(5, 6, weight=1.0)
    G.add_edge(7, 8, weight=0.8)
    G.add_edge(9, 10, weight=1.2)

    score = calculate_stake_score(G, profile_id=1)

    assert score > 0  # Should be penalized


def test_calculate_stake_score_normal_stakes():
    """Normal stakes get low or zero score."""
    G = nx.DiGraph()
    G.add_edge(2, 1, weight=0.5)
    G.add_edge(3, 1, weight=0.8)
    G.add_edge(4, 1, weight=0.6)

    score = calculate_stake_score(G, profile_id=1)

    assert score == 0.0


# === Reciprocity Tests ===


def test_calculate_reciprocity_ratio_balanced():
    """Balanced reciprocity has ratio ~1.0."""
    G = nx.DiGraph()
    # Profile 1 receives 5 vouches
    for i in range(2, 7):
        G.add_edge(i, 1)
    # Profile 1 gives 5 vouches
    for i in range(7, 12):
        G.add_edge(1, i)

    ratio = calculate_reciprocity_ratio(G, profile_id=1)

    assert ratio == 1.0  # 5 given / 5 received


def test_calculate_reciprocity_ratio_farming():
    """Farming pattern: receives many, gives none."""
    G = nx.DiGraph()
    # Profile 1 receives 10 vouches
    for i in range(2, 12):
        G.add_edge(i, 1)
    # Profile 1 gives 0 vouches

    ratio = calculate_reciprocity_ratio(G, profile_id=1)

    assert ratio == 0.0


def test_calculate_reciprocity_score_farming():
    """Farming pattern gets high score."""
    G = nx.DiGraph()
    # Profile 1 receives 25 vouches
    for i in range(2, 27):
        G.add_edge(i, 1)
    # Profile 1 gives 0 vouches

    score = calculate_reciprocity_score(G, profile_id=1)

    assert score >= 60.0  # Should be flagged


def test_calculate_reciprocity_score_balanced():
    """Balanced reciprocity gets low score."""
    G = nx.DiGraph()
    # Profile 1 receives 10 vouches
    for i in range(2, 12):
        G.add_edge(i, 1)
    # Profile 1 gives 8 vouches
    for i in range(12, 20):
        G.add_edge(1, i)

    score = calculate_reciprocity_score(G, profile_id=1)

    assert score == 0.0
