"""Analyze vouch reciprocity patterns."""
import networkx as nx


def calculate_reciprocity_ratio(G: nx.DiGraph, profile_id: int) -> float:
    """Calculate ratio of vouches given to vouches received."""
    received = G.in_degree(profile_id)
    given = G.out_degree(profile_id)

    if received == 0:
        return 1.0  # No vouches received, ratio is neutral

    return given / received


def calculate_reciprocity_score(G: nx.DiGraph, profile_id: int) -> float:
    """Calculate reciprocity-based risk score.

    High score if:
    - Receives many vouches but gives almost none (farming)
    - Or gives many but receives none (boosting others)
    """
    ratio = calculate_reciprocity_ratio(G, profile_id)
    received = G.in_degree(profile_id)

    if received < 5:
        return 0.0  # Not enough data

    # Farming pattern: receives many, gives few
    if ratio < 0.05 and received > 20:
        return 80.0
    elif ratio < 0.1 and received > 10:
        return 60.0
    elif ratio < 0.2:
        return 40.0

    # Boosting pattern: gives many, receives few (less suspicious)
    if ratio > 10:
        return 20.0

    return 0.0
