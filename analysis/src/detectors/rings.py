"""Detect circular vouch patterns (rings)."""
import networkx as nx
from typing import Iterator
import time
from datetime import timedelta


def find_rings_around_node(
    G: nx.DiGraph, start_node: int, max_length: int = 5
) -> list[list[int]]:
    """Find rings that include a specific node using BFS.

    More efficient than full graph cycle detection.
    """
    rings = []

    # For each neighbor, try to find a path back
    for neighbor in G.successors(start_node):
        # BFS to find path from neighbor back to start
        visited = {start_node, neighbor}
        queue = [(neighbor, [start_node, neighbor])]

        while queue:
            current, path = queue.pop(0)

            if len(path) > max_length:
                continue

            for next_node in G.successors(current):
                if next_node == start_node and len(path) >= 3:
                    # Found a ring!
                    rings.append(path)
                elif next_node not in visited and len(path) < max_length:
                    visited.add(next_node)
                    queue.append((next_node, path + [next_node]))

    return rings


def find_rings(
    G: nx.DiGraph, max_length: int = 5, max_rings: int = 10000, timeout_sec: int = 60
) -> list[list[int]]:
    """Find cycles (rings) in the vouch graph.

    Uses optimized approach focusing on high-degree nodes first.

    Args:
        G: Directed vouch graph
        max_length: Maximum ring size to detect (3-5 are suspicious)
        max_rings: Maximum number of rings to find
        timeout_sec: Timeout in seconds

    Returns:
        List of rings, each ring is a list of profile IDs
    """
    rings = []
    seen_rings = set()  # Track unique rings by frozenset
    start_time = time.time()

    # Sort nodes by degree - high-degree nodes more likely in rings
    nodes_by_degree = sorted(
        G.nodes(),
        key=lambda n: G.in_degree(n) + G.out_degree(n),
        reverse=True,
    )

    for node in nodes_by_degree:
        if time.time() - start_time > timeout_sec:
            break

        if len(rings) >= max_rings:
            break

        # Find rings around this node
        node_rings = find_rings_around_node(G, node, max_length)

        for ring in node_rings:
            ring_key = frozenset(ring)
            if ring_key not in seen_rings:
                seen_rings.add(ring_key)
                rings.append(ring)

                if len(rings) >= max_rings:
                    break

    return rings


def get_rings_for_profile(
    G: nx.DiGraph, profile_id: int, max_length: int = 5
) -> list[list[int]]:
    """Get all rings that include a specific profile."""
    all_rings = find_rings(G, max_length)
    return [ring for ring in all_rings if profile_id in ring]


def get_ring_stake(G: nx.DiGraph, ring: list[int]) -> float:
    """Calculate total stake in a ring's edges."""
    total_stake = 0.0
    for i in range(len(ring)):
        u = ring[i]
        v = ring[(i + 1) % len(ring)]
        if G.has_edge(u, v):
            total_stake += G[u][v].get("weight", 0)
    return total_stake


def get_ring_time_span(G: nx.DiGraph, ring: list[int]) -> timedelta | None:
    """Calculate time span between earliest and latest vouch in ring."""
    timestamps = []
    for i in range(len(ring)):
        u = ring[i]
        v = ring[(i + 1) % len(ring)]
        if G.has_edge(u, v):
            ts = G[u][v].get("timestamp")
            if ts:
                timestamps.append(ts)

    if len(timestamps) < 2:
        return None

    return max(timestamps) - min(timestamps)


def calculate_ring_score(
    G: nx.DiGraph, profile_id: int, max_length: int = 5, precomputed_rings: list = None
) -> float:
    """Calculate ring-based risk score for a profile.

    Scoring (v2 - stake and temporal weighted):
    - Base score by ring size: 3-node=40, 4-node=30, 5-node=20
    - Low stake multiplier: rings with <0.1 ETH total get 1.3x
    - Fast formation multiplier: rings formed in <7 days get 1.3x
    - High stake discount: rings with >1 ETH total get 0.7x

    Args:
        G: Directed vouch graph
        profile_id: Profile to score
        max_length: Maximum ring size
        precomputed_rings: Optionally pass pre-computed rings for efficiency

    Returns:
        Risk score 0-100
    """
    if precomputed_rings is not None:
        rings = [r for r in precomputed_rings if profile_id in r]
    else:
        rings = get_rings_for_profile(G, profile_id, max_length)

    if not rings:
        return 0.0

    score = 0.0
    for ring in rings:
        ring_size = len(ring)

        # Base score by size
        if ring_size == 3:
            base = 40
        elif ring_size == 4:
            base = 30
        elif ring_size == 5:
            base = 20
        else:
            continue

        # Stake-based modifier
        ring_stake = get_ring_stake(G, ring)
        if ring_stake < 0.1:  # Very low stake ring
            stake_modifier = 1.3
        elif ring_stake > 1.0:  # High stake ring (more legitimate)
            stake_modifier = 0.7
        else:
            stake_modifier = 1.0

        # Temporal modifier - fast formation is suspicious
        time_span = get_ring_time_span(G, ring)
        if time_span and time_span < timedelta(days=7):
            temporal_modifier = 1.3  # Formed quickly
        elif time_span and time_span > timedelta(days=90):
            temporal_modifier = 0.8  # Formed over long time (more organic)
        else:
            temporal_modifier = 1.0

        ring_score = base * stake_modifier * temporal_modifier
        score += ring_score

    return min(100.0, score)


def get_ring_stats(G: nx.DiGraph, max_length: int = 5) -> dict:
    """Get statistics about rings in the graph."""
    rings = find_rings(G, max_length)

    ring_sizes = {}
    for ring in rings:
        size = len(ring)
        ring_sizes[size] = ring_sizes.get(size, 0) + 1

    profiles_in_rings = set()
    for ring in rings:
        profiles_in_rings.update(ring)

    return {
        "total_rings": len(rings),
        "rings_by_size": ring_sizes,
        "profiles_in_rings": len(profiles_in_rings),
        "pct_profiles_in_rings": (
            len(profiles_in_rings) / G.number_of_nodes() * 100
            if G.number_of_nodes() > 0
            else 0
        ),
        "rings": rings,  # Include for reuse
    }
