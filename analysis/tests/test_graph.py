"""Tests for graph builder."""
import pytest
import sys
from pathlib import Path
import networkx as nx

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.graph import build_vouch_graph, get_graph_stats, wei_to_eth


def test_wei_to_eth_conversion():
    """Test wei to ETH conversion."""
    assert wei_to_eth("1000000000000000000") == 1.0
    assert wei_to_eth("500000000000000000") == 0.5
    assert wei_to_eth(0) == 0.0


def test_build_graph_returns_digraph():
    """Test that build_vouch_graph returns a DiGraph."""
    vouches = [
        {"authorProfileId": 1, "subjectProfileId": 2, "balance": "1000000000000000000"},
        {"authorProfileId": 2, "subjectProfileId": 3, "balance": "500000000000000000"},
    ]
    G = build_vouch_graph(vouches)
    assert isinstance(G, nx.DiGraph)


def test_graph_has_correct_edges():
    """Test that graph has correct edges."""
    vouches = [
        {"authorProfileId": 1, "subjectProfileId": 2, "balance": "1000000000000000000"},
        {"authorProfileId": 2, "subjectProfileId": 3, "balance": "500000000000000000"},
    ]
    G = build_vouch_graph(vouches)
    assert G.has_edge(1, 2)
    assert G.has_edge(2, 3)
    assert not G.has_edge(1, 3)


def test_graph_edge_has_weight():
    """Test that edges have weight attribute."""
    vouches = [
        {"authorProfileId": 1, "subjectProfileId": 2, "balance": "1000000000000000000"},
    ]
    G = build_vouch_graph(vouches)
    assert G[1][2]["weight"] == 1.0


def test_graph_stats():
    """Test graph statistics calculation."""
    vouches = [
        {"authorProfileId": 1, "subjectProfileId": 2, "balance": "1000000000000000000"},
        {"authorProfileId": 2, "subjectProfileId": 3, "balance": "500000000000000000"},
        {"authorProfileId": 3, "subjectProfileId": 1, "balance": "200000000000000000"},
    ]
    G = build_vouch_graph(vouches)
    stats = get_graph_stats(G)

    assert stats["nodes"] == 3
    assert stats["edges"] == 3
    assert stats["density"] > 0


def test_build_graph_with_real_data():
    """Test building graph from real vouch data."""
    from src.loader import load_vouches

    vouches = load_vouches("/Users/kluless/ethos-research/data/raw/vouches.json")
    G = build_vouch_graph(vouches)

    assert G.number_of_nodes() > 1000
    assert G.number_of_edges() > 10000
