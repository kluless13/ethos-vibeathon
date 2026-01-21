"""Detect circular vouch patterns (rings)."""
import networkx as nx
from typing import Iterator
import time


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


def calculate_ring_score(
    G: nx.DiGraph, profile_id: int, max_length: int = 5, precomputed_rings: list = None
) -> float:
    """Calculate ring-based risk score for a profile.

    Scoring:
    - In 3-node ring: +40 points per ring
    - In 4-node ring: +30 points per ring
    - In 5-node ring: +20 points per ring

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
        if ring_size == 3:
            score += 40
        elif ring_size == 4:
            score += 30
        elif ring_size == 5:
            score += 20

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
