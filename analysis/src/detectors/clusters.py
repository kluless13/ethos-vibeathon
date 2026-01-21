"""Detect isolated vouch clusters."""
import networkx as nx
from networkx.algorithms.community import louvain_communities


def find_communities(G: nx.DiGraph) -> list[set[int]]:
    """Find communities using Louvain algorithm."""
    # Convert to undirected for community detection
    G_undirected = G.to_undirected()

    if G_undirected.number_of_nodes() == 0:
        return []

    try:
        communities = louvain_communities(G_undirected, resolution=1.0)
        return [set(c) for c in communities]
    except Exception:
        return []


def calculate_insularity(G: nx.DiGraph, community: set[int]) -> float:
    """Calculate how isolated a community is.

    Insularity = internal_edges / (internal_edges + external_edges)
    """
    internal = 0
    external = 0

    for node in community:
        for neighbor in G.successors(node):
            if neighbor in community:
                internal += 1
            else:
                external += 1
        for neighbor in G.predecessors(node):
            if neighbor in community:
                internal += 1
            else:
                external += 1

    # Avoid double counting internal edges
    internal = internal // 2

    total = internal + external
    if total == 0:
        return 0.0

    return internal / total


def find_isolated_clusters(
    G: nx.DiGraph, insularity_threshold: float = 0.8
) -> list[dict]:
    """Find clusters that are suspiciously isolated.

    Args:
        G: Directed vouch graph
        insularity_threshold: Minimum insularity to flag (0-1)

    Returns:
        List of isolated clusters with metadata
    """
    communities = find_communities(G)
    isolated = []

    for community in communities:
        if len(community) < 3:
            continue

        insularity = calculate_insularity(G, community)

        if insularity >= insularity_threshold:
            isolated.append(
                {
                    "members": list(community),
                    "size": len(community),
                    "insularity": insularity,
                }
            )

    return isolated


def precompute_cluster_data(G: nx.DiGraph, insularity_threshold: float = 0.7) -> dict:
    """Pre-compute community data for efficient scoring.

    Returns:
        Dict with profile_id -> (insularity, community_size) for isolated profiles
    """
    communities = find_communities(G)
    profile_cluster_data = {}

    for community in communities:
        if len(community) < 3:
            continue

        insularity = calculate_insularity(G, community)

        if insularity >= insularity_threshold:
            for profile_id in community:
                profile_cluster_data[profile_id] = (insularity, len(community))

    return profile_cluster_data


def calculate_cluster_score(
    G: nx.DiGraph,
    profile_id: int,
    insularity_threshold: float = 0.7,
    precomputed_clusters: dict = None,
) -> float:
    """Calculate cluster-based risk score for a profile.

    Higher score if profile is in an isolated cluster.

    Args:
        G: Directed vouch graph
        profile_id: Profile to score
        insularity_threshold: Minimum insularity to flag
        precomputed_clusters: Optional pre-computed cluster data from precompute_cluster_data()

    Returns:
        Risk score 0-100
    """
    if precomputed_clusters is not None:
        if profile_id in precomputed_clusters:
            insularity, size = precomputed_clusters[profile_id]
            base_score = insularity * 100
            size_factor = min(1.0, 10 / size)
            return min(100.0, base_score * (0.5 + 0.5 * size_factor))
        return 0.0

    # Fallback to computing on the fly (slow)
    communities = find_communities(G)

    for community in communities:
        if profile_id in community:
            insularity = calculate_insularity(G, community)

            if insularity >= insularity_threshold:
                # Score based on insularity and cluster size
                base_score = insularity * 100
                # Smaller clusters are more suspicious
                size_factor = min(1.0, 10 / len(community))
                return min(100.0, base_score * (0.5 + 0.5 * size_factor))

    return 0.0
