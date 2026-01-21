"""Analyze stake patterns for suspicious activity."""
import networkx as nx
import numpy as np


def get_incoming_stakes(G: nx.DiGraph, profile_id: int) -> list[float]:
    """Get all stake amounts for vouches received by profile."""
    stakes = []
    for pred in G.predecessors(profile_id):
        edge_data = G[pred][profile_id]
        stakes.append(edge_data.get("weight", 0))
    return stakes


def calculate_stake_score(G: nx.DiGraph, profile_id: int) -> float:
    """Calculate stake-based risk score.

    High score if:
    - Many low-stake vouches
    - Low average stake compared to network
    """
    stakes = get_incoming_stakes(G, profile_id)

    if len(stakes) < 3:
        return 0.0

    avg_stake = np.mean(stakes)
    num_vouches = len(stakes)

    # Calculate network average for comparison
    all_weights = [d.get("weight", 0) for u, v, d in G.edges(data=True)]
    network_avg = np.mean(all_weights) if all_weights else 0.1

    score = 0.0

    # Penalize if average stake is much lower than network
    if network_avg > 0:
        if avg_stake < network_avg * 0.1:
            score += 50
        elif avg_stake < network_avg * 0.3:
            score += 30
        elif avg_stake < network_avg * 0.5:
            score += 15

    # Penalize if many tiny stakes (< 0.01 ETH)
    tiny_stakes = sum(1 for s in stakes if s < 0.01)
    tiny_ratio = tiny_stakes / num_vouches if num_vouches > 0 else 0

    if tiny_ratio > 0.8:
        score += 50
    elif tiny_ratio > 0.5:
        score += 30
    elif tiny_ratio > 0.3:
        score += 15

    return min(100.0, score)
