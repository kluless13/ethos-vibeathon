"""Collusion detection modules."""

from .rings import find_rings, calculate_ring_score, get_ring_stats, get_rings_for_profile
from .clusters import (
    find_communities,
    find_isolated_clusters,
    calculate_cluster_score,
    calculate_insularity,
    precompute_cluster_data,
)
from .bursts import detect_vouch_burst, calculate_burst_score, group_by_window
from .stakes import calculate_stake_score, get_incoming_stakes
from .reciprocity import calculate_reciprocity_ratio, calculate_reciprocity_score

__all__ = [
    # Rings
    "find_rings",
    "calculate_ring_score",
    "get_ring_stats",
    "get_rings_for_profile",
    # Clusters
    "find_communities",
    "find_isolated_clusters",
    "calculate_cluster_score",
    "calculate_insularity",
    "precompute_cluster_data",
    # Bursts
    "detect_vouch_burst",
    "calculate_burst_score",
    "group_by_window",
    # Stakes
    "calculate_stake_score",
    "get_incoming_stakes",
    # Reciprocity
    "calculate_reciprocity_ratio",
    "calculate_reciprocity_score",
]
