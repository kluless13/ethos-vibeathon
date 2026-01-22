"""Composite risk scoring for Ethos profiles."""

from dataclasses import dataclass
from typing import Optional

import networkx as nx

from .detectors import (
    calculate_ring_score,
    calculate_cluster_score,
    calculate_burst_score,
    calculate_stake_score,
    calculate_reciprocity_score,
    get_ring_stats,
    precompute_cluster_data,
)
from .graph import is_official_account


@dataclass
class RiskBreakdown:
    """Breakdown of risk score components."""

    ring_score: float
    cluster_score: float
    burst_score: float
    stake_score: float
    reciprocity_score: float
    composite_score: float
    risk_level: str

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "ring_score": round(self.ring_score, 2),
            "cluster_score": round(self.cluster_score, 2),
            "burst_score": round(self.burst_score, 2),
            "stake_score": round(self.stake_score, 2),
            "reciprocity_score": round(self.reciprocity_score, 2),
            "composite_score": round(self.composite_score, 2),
            "risk_level": self.risk_level,
        }


# Default weights from PRD
DEFAULT_WEIGHTS = {
    "ring": 0.30,
    "cluster": 0.25,
    "burst": 0.20,
    "stake": 0.15,
    "reciprocity": 0.10,
}


def get_risk_level(score: float) -> str:
    """Categorize risk level based on composite score."""
    if score >= 70:
        return "critical"
    elif score >= 50:
        return "high"
    elif score >= 30:
        return "medium"
    elif score >= 10:
        return "low"
    else:
        return "minimal"


def calculate_risk_score(
    G: nx.DiGraph,
    profile_id: int,
    vouches: list[dict],
    weights: Optional[dict] = None,
    precomputed_rings: Optional[list] = None,
    precomputed_clusters: Optional[dict] = None,
) -> RiskBreakdown:
    """Calculate composite risk score for a profile.

    Formula:
        Risk = (0.30 × ring) + (0.25 × cluster) + (0.20 × burst)
             + (0.15 × stake) + (0.10 × reciprocity)

    Args:
        G: Directed vouch graph
        profile_id: Profile to analyze
        vouches: All vouch records (for burst detection)
        weights: Optional custom weights
        precomputed_rings: Pre-computed rings for efficiency
        precomputed_clusters: Pre-computed cluster data for efficiency

    Returns:
        RiskBreakdown with all component scores and composite
    """
    w = weights or DEFAULT_WEIGHTS

    # Skip official accounts - they have naturally high activity
    if is_official_account(G, profile_id):
        return RiskBreakdown(
            ring_score=0.0,
            cluster_score=0.0,
            burst_score=0.0,
            stake_score=0.0,
            reciprocity_score=0.0,
            composite_score=0.0,
            risk_level="official",
        )

    # Calculate individual scores
    ring_score = calculate_ring_score(
        G, profile_id, precomputed_rings=precomputed_rings
    )
    cluster_score = calculate_cluster_score(
        G, profile_id, precomputed_clusters=precomputed_clusters
    )
    burst_score = calculate_burst_score(vouches, profile_id)
    stake_score = calculate_stake_score(G, profile_id)
    reciprocity_score = calculate_reciprocity_score(G, profile_id)

    # Calculate weighted composite
    composite = (
        w["ring"] * ring_score
        + w["cluster"] * cluster_score
        + w["burst"] * burst_score
        + w["stake"] * stake_score
        + w["reciprocity"] * reciprocity_score
    )

    # Cap at 100
    composite = min(100.0, composite)

    return RiskBreakdown(
        ring_score=ring_score,
        cluster_score=cluster_score,
        burst_score=burst_score,
        stake_score=stake_score,
        reciprocity_score=reciprocity_score,
        composite_score=composite,
        risk_level=get_risk_level(composite),
    )


def analyze_all_profiles(
    G: nx.DiGraph,
    vouches: list[dict],
    weights: Optional[dict] = None,
) -> list[dict]:
    """Analyze all profiles in the graph.

    Args:
        G: Directed vouch graph
        vouches: All vouch records
        weights: Optional custom weights

    Returns:
        List of dicts with profile_id and risk breakdown
    """
    # Pre-compute expensive operations once
    ring_stats = get_ring_stats(G, max_length=5)
    precomputed_rings = ring_stats.get("rings", [])
    precomputed_clusters = precompute_cluster_data(G)

    results = []
    for profile_id in G.nodes():
        breakdown = calculate_risk_score(
            G, profile_id, vouches, weights, precomputed_rings, precomputed_clusters
        )
        results.append(
            {
                "profile_id": profile_id,
                **breakdown.to_dict(),
            }
        )

    # Sort by composite score descending
    results.sort(key=lambda x: x["composite_score"], reverse=True)

    return results


def get_high_risk_profiles(
    results: list[dict], threshold: float = 30.0
) -> list[dict]:
    """Filter profiles above risk threshold.

    Args:
        results: Output from analyze_all_profiles
        threshold: Minimum composite score to include

    Returns:
        Filtered list of high-risk profiles
    """
    return [r for r in results if r["composite_score"] >= threshold]


def get_network_summary(G: nx.DiGraph, results: list[dict]) -> dict:
    """Generate summary statistics for the network.

    Args:
        G: Vouch graph
        results: Output from analyze_all_profiles

    Returns:
        Summary statistics dict
    """
    total_profiles = len(results)

    risk_distribution = {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0,
        "minimal": 0,
        "official": 0,
    }

    for r in results:
        risk_distribution[r["risk_level"]] += 1

    # Calculate percentages
    risk_pct = {
        k: round(v / total_profiles * 100, 2) if total_profiles > 0 else 0
        for k, v in risk_distribution.items()
    }

    # Get top offenders
    top_10 = results[:10] if len(results) >= 10 else results

    return {
        "total_profiles": total_profiles,
        "total_vouches": G.number_of_edges(),
        "risk_distribution": risk_distribution,
        "risk_percentages": risk_pct,
        "top_risky_profiles": top_10,
        "avg_risk_score": (
            round(sum(r["composite_score"] for r in results) / total_profiles, 2)
            if total_profiles > 0
            else 0
        ),
    }
