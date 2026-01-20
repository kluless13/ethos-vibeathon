"""Build networkx graph from vouch data."""
import networkx as nx
from typing import Any

WEI_PER_ETH = 10**18


def wei_to_eth(wei: str | int) -> float:
    """Convert wei string to ETH float."""
    return int(wei) / WEI_PER_ETH


def build_vouch_graph(vouches: list[dict[str, Any]]) -> nx.DiGraph:
    """Build directed graph from vouch records.

    Nodes: Profile IDs
    Edges: Vouch relationships (voucher -> subject)
    Edge weights: Stake amount in ETH

    Args:
        vouches: List of vouch records

    Returns:
        Directed graph with weighted edges
    """
    G = nx.DiGraph()

    for vouch in vouches:
        author = vouch["authorProfileId"]
        subject = vouch["subjectProfileId"]
        balance = wei_to_eth(vouch.get("balance", "0"))

        # Add edge (or update weight if exists)
        if G.has_edge(author, subject):
            G[author][subject]["weight"] += balance
            G[author][subject]["count"] += 1
        else:
            G.add_edge(
                author,
                subject,
                weight=balance,
                count=1,
                staked=vouch.get("staked", False),
                archived=vouch.get("archived", False),
            )

        # Add node attributes if user data available
        if "authorUser" in vouch and vouch["authorUser"]:
            if author not in G.nodes or "score" not in G.nodes[author]:
                G.nodes[author]["score"] = vouch["authorUser"].get("score", 0)
                G.nodes[author]["username"] = vouch["authorUser"].get("username", "")

        if "subjectUser" in vouch and vouch["subjectUser"]:
            if subject not in G.nodes or "score" not in G.nodes[subject]:
                G.nodes[subject]["score"] = vouch["subjectUser"].get("score", 0)
                G.nodes[subject]["username"] = vouch["subjectUser"].get("username", "")

    return G


def get_graph_stats(G: nx.DiGraph) -> dict:
    """Get statistics about the vouch graph."""
    num_nodes = G.number_of_nodes()
    if num_nodes == 0:
        return {
            "nodes": 0,
            "edges": 0,
            "density": 0,
            "avg_in_degree": 0,
            "avg_out_degree": 0,
        }

    return {
        "nodes": num_nodes,
        "edges": G.number_of_edges(),
        "density": nx.density(G),
        "avg_in_degree": sum(d for n, d in G.in_degree()) / num_nodes,
        "avg_out_degree": sum(d for n, d in G.out_degree()) / num_nodes,
    }


def get_top_profiles_by_vouches(G: nx.DiGraph, n: int = 100) -> list[tuple[int, int]]:
    """Get top profiles by number of vouches received.

    Returns:
        List of (profile_id, vouch_count) tuples
    """
    in_degrees = [(node, G.in_degree(node)) for node in G.nodes()]
    in_degrees.sort(key=lambda x: x[1], reverse=True)
    return in_degrees[:n]
