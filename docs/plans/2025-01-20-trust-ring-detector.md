# Trust Ring Detector — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a collusion ring detector for Ethos Network vouch data with on-chain risk scores on Base.

**Architecture:** Python analysis engine → risk scores → Base smart contract + Next.js demo UI

**Tech Stack:** Python 3.11, networkx, Solidity 0.8.19, Hardhat, Next.js 14, OnchainKit, vis-network

**Data Source:** `/Users/kluless/ethos-research/data/raw/vouches.json` (53,400 vouches already collected)

---

## Task 1: Project Setup

**Files:**
- Create: `ethos-vibeathon/analysis/pyproject.toml`
- Create: `ethos-vibeathon/analysis/requirements.txt`
- Create: `ethos-vibeathon/analysis/src/__init__.py`

**Step 1: Create Python project structure**

```bash
cd /Users/kluless/ethos-vibeathon
mkdir -p analysis/src/detectors analysis/tests analysis/outputs
touch analysis/src/__init__.py
touch analysis/src/detectors/__init__.py
```

**Step 2: Create requirements.txt**

```
networkx>=3.0
numpy>=1.24
pandas>=2.0
ethos-py>=0.2.3
python-dotenv>=1.0
tqdm>=4.65
```

**Step 3: Create pyproject.toml**

```toml
[project]
name = "trust-ring-detector"
version = "0.1.0"
description = "Collusion ring detection for Ethos Network"
requires-python = ">=3.9"

[project.scripts]
analyze = "src.main:main"
```

**Step 4: Install dependencies**

```bash
cd /Users/kluless/ethos-vibeathon/analysis
pip install -r requirements.txt
```

**Step 5: Commit**

```bash
git add analysis/
git commit -m "feat: initialize Python analysis project structure"
```

---

## Task 2: Data Loader

**Files:**
- Create: `analysis/src/loader.py`
- Create: `analysis/tests/test_loader.py`

**Step 1: Write failing test**

```python
# analysis/tests/test_loader.py
import pytest
from src.loader import load_vouches, load_markets

def test_load_vouches_returns_list():
    vouches = load_vouches("/Users/kluless/ethos-research/data/raw/vouches.json")
    assert isinstance(vouches, list)
    assert len(vouches) > 0

def test_vouch_has_required_fields():
    vouches = load_vouches("/Users/kluless/ethos-research/data/raw/vouches.json")
    vouch = vouches[0]
    assert "authorProfileId" in vouch
    assert "subjectProfileId" in vouch
    assert "balance" in vouch
```

**Step 2: Run test to verify it fails**

```bash
cd /Users/kluless/ethos-vibeathon/analysis
python -m pytest tests/test_loader.py -v
```

Expected: FAIL (module not found)

**Step 3: Implement loader.py**

```python
# analysis/src/loader.py
"""Load Ethos vouch and market data from JSON files."""
import json
from pathlib import Path
from typing import Any

def load_vouches(path: str | Path) -> list[dict[str, Any]]:
    """Load vouches from JSON file.

    Args:
        path: Path to vouches.json file

    Returns:
        List of vouch records
    """
    with open(path) as f:
        data = json.load(f)

    # Handle nested structure from ethos-research
    if isinstance(data, dict) and "vouches" in data:
        return data["vouches"]
    return data

def load_markets(path: str | Path) -> list[dict[str, Any]]:
    """Load markets from JSON file."""
    with open(path) as f:
        data = json.load(f)

    if isinstance(data, dict) and "markets" in data:
        return data["markets"]
    return data

def get_vouch_stats(vouches: list[dict]) -> dict:
    """Get basic statistics about vouches."""
    unique_authors = set(v["authorProfileId"] for v in vouches)
    unique_subjects = set(v["subjectProfileId"] for v in vouches)

    return {
        "total_vouches": len(vouches),
        "unique_vouchers": len(unique_authors),
        "unique_subjects": len(unique_subjects),
        "unique_profiles": len(unique_authors | unique_subjects)
    }
```

**Step 4: Run test to verify it passes**

```bash
python -m pytest tests/test_loader.py -v
```

Expected: PASS

**Step 5: Commit**

```bash
git add analysis/src/loader.py analysis/tests/test_loader.py
git commit -m "feat: add vouch data loader with tests"
```

---

## Task 3: Graph Builder

**Files:**
- Create: `analysis/src/graph.py`
- Create: `analysis/tests/test_graph.py`

**Step 1: Write failing test**

```python
# analysis/tests/test_graph.py
import pytest
import networkx as nx
from src.graph import build_vouch_graph

def test_build_graph_returns_digraph():
    vouches = [
        {"authorProfileId": 1, "subjectProfileId": 2, "balance": "1000000000000000000"},
        {"authorProfileId": 2, "subjectProfileId": 3, "balance": "500000000000000000"},
    ]
    G = build_vouch_graph(vouches)
    assert isinstance(G, nx.DiGraph)

def test_graph_has_correct_edges():
    vouches = [
        {"authorProfileId": 1, "subjectProfileId": 2, "balance": "1000000000000000000"},
        {"authorProfileId": 2, "subjectProfileId": 3, "balance": "500000000000000000"},
    ]
    G = build_vouch_graph(vouches)
    assert G.has_edge(1, 2)
    assert G.has_edge(2, 3)
    assert not G.has_edge(1, 3)

def test_graph_edge_has_weight():
    vouches = [
        {"authorProfileId": 1, "subjectProfileId": 2, "balance": "1000000000000000000"},
    ]
    G = build_vouch_graph(vouches)
    assert G[1][2]["weight"] == 1.0  # 1 ETH
```

**Step 2: Run test to verify it fails**

```bash
python -m pytest tests/test_graph.py -v
```

**Step 3: Implement graph.py**

```python
# analysis/src/graph.py
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
                archived=vouch.get("archived", False)
            )

        # Add node attributes if user data available
        if "authorUser" in vouch and author not in G.nodes:
            G.nodes[author]["score"] = vouch["authorUser"].get("score", 0)
            G.nodes[author]["username"] = vouch["authorUser"].get("username", "")

        if "subjectUser" in vouch and subject not in G.nodes:
            G.nodes[subject]["score"] = vouch["subjectUser"].get("score", 0)
            G.nodes[subject]["username"] = vouch["subjectUser"].get("username", "")

    return G

def get_graph_stats(G: nx.DiGraph) -> dict:
    """Get statistics about the vouch graph."""
    return {
        "nodes": G.number_of_nodes(),
        "edges": G.number_of_edges(),
        "density": nx.density(G),
        "avg_in_degree": sum(d for n, d in G.in_degree()) / G.number_of_nodes(),
        "avg_out_degree": sum(d for n, d in G.out_degree()) / G.number_of_nodes(),
    }
```

**Step 4: Run test**

```bash
python -m pytest tests/test_graph.py -v
```

**Step 5: Commit**

```bash
git add analysis/src/graph.py analysis/tests/test_graph.py
git commit -m "feat: add vouch graph builder with tests"
```

---

## Task 4: Ring Detector

**Files:**
- Create: `analysis/src/detectors/rings.py`
- Create: `analysis/tests/test_rings.py`

**Step 1: Write failing test**

```python
# analysis/tests/test_rings.py
import pytest
import networkx as nx
from src.detectors.rings import find_rings, calculate_ring_score

def test_find_simple_ring():
    G = nx.DiGraph()
    G.add_edges_from([(1, 2), (2, 3), (3, 1)])  # Simple triangle
    rings = find_rings(G, max_length=5)
    assert len(rings) >= 1
    assert set([1, 2, 3]) in [set(r) for r in rings]

def test_no_ring_in_chain():
    G = nx.DiGraph()
    G.add_edges_from([(1, 2), (2, 3), (3, 4)])  # Chain, no ring
    rings = find_rings(G, max_length=5)
    assert len(rings) == 0

def test_ring_score_zero_for_no_rings():
    G = nx.DiGraph()
    G.add_edges_from([(1, 2), (2, 3)])
    score = calculate_ring_score(G, profile_id=1)
    assert score == 0

def test_ring_score_high_for_ring_member():
    G = nx.DiGraph()
    G.add_edges_from([(1, 2), (2, 3), (3, 1)])
    score = calculate_ring_score(G, profile_id=1)
    assert score > 50  # Should be flagged
```

**Step 2: Run test to verify it fails**

```bash
python -m pytest tests/test_rings.py -v
```

**Step 3: Implement rings.py**

```python
# analysis/src/detectors/rings.py
"""Detect circular vouch patterns (rings)."""
import networkx as nx
from typing import Iterator

def find_rings(G: nx.DiGraph, max_length: int = 5) -> list[list[int]]:
    """Find all cycles (rings) in the vouch graph.

    Args:
        G: Directed vouch graph
        max_length: Maximum ring size to detect (3-5 are suspicious)

    Returns:
        List of rings, each ring is a list of profile IDs
    """
    rings = []

    try:
        # Find all simple cycles
        for cycle in nx.simple_cycles(G):
            if 3 <= len(cycle) <= max_length:
                rings.append(cycle)
    except nx.NetworkXError:
        pass

    return rings

def get_rings_for_profile(G: nx.DiGraph, profile_id: int, max_length: int = 5) -> list[list[int]]:
    """Get all rings that include a specific profile."""
    all_rings = find_rings(G, max_length)
    return [ring for ring in all_rings if profile_id in ring]

def calculate_ring_score(G: nx.DiGraph, profile_id: int, max_length: int = 5) -> float:
    """Calculate ring-based risk score for a profile.

    Scoring:
    - In 3-node ring: +40 points per ring
    - In 4-node ring: +30 points per ring
    - In 5-node ring: +20 points per ring

    Args:
        G: Directed vouch graph
        profile_id: Profile to score
        max_length: Maximum ring size

    Returns:
        Risk score 0-100
    """
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
        "pct_profiles_in_rings": len(profiles_in_rings) / G.number_of_nodes() * 100 if G.number_of_nodes() > 0 else 0
    }
```

**Step 4: Run test**

```bash
python -m pytest tests/test_rings.py -v
```

**Step 5: Commit**

```bash
git add analysis/src/detectors/rings.py analysis/tests/test_rings.py
git commit -m "feat: add ring (cycle) detector with tests"
```

---

## Task 5: Cluster Detector

**Files:**
- Create: `analysis/src/detectors/clusters.py`
- Create: `analysis/tests/test_clusters.py`

**Step 1: Write failing test**

```python
# analysis/tests/test_clusters.py
import pytest
import networkx as nx
from src.detectors.clusters import find_isolated_clusters, calculate_cluster_score

def test_find_isolated_cluster():
    G = nx.DiGraph()
    # Cluster A (isolated)
    G.add_edges_from([(1, 2), (2, 3), (3, 1), (1, 3), (2, 1), (3, 2)])
    # Cluster B (isolated)
    G.add_edges_from([(4, 5), (5, 6), (6, 4), (4, 6), (5, 4), (6, 5)])
    # Weak connection between clusters
    G.add_edge(3, 4, weight=0.001)

    clusters = find_isolated_clusters(G, insularity_threshold=0.8)
    assert len(clusters) >= 1

def test_cluster_score_for_isolated_member():
    G = nx.DiGraph()
    # Highly isolated cluster
    G.add_edges_from([(1, 2), (2, 3), (3, 1), (1, 3), (2, 1), (3, 2)])
    # Some external nodes
    G.add_edges_from([(4, 5), (5, 6)])

    score = calculate_cluster_score(G, profile_id=1)
    assert score >= 0
```

**Step 2: Run test to fail**

```bash
python -m pytest tests/test_clusters.py -v
```

**Step 3: Implement clusters.py**

```python
# analysis/src/detectors/clusters.py
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

def find_isolated_clusters(G: nx.DiGraph, insularity_threshold: float = 0.8) -> list[dict]:
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
            isolated.append({
                "members": list(community),
                "size": len(community),
                "insularity": insularity
            })

    return isolated

def calculate_cluster_score(G: nx.DiGraph, profile_id: int, insularity_threshold: float = 0.7) -> float:
    """Calculate cluster-based risk score for a profile.

    Higher score if profile is in an isolated cluster.
    """
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
```

**Step 4: Run test**

```bash
python -m pytest tests/test_clusters.py -v
```

**Step 5: Commit**

```bash
git add analysis/src/detectors/clusters.py analysis/tests/test_clusters.py
git commit -m "feat: add isolated cluster detector with tests"
```

---

## Task 6: Burst Detector

**Files:**
- Create: `analysis/src/detectors/bursts.py`
- Create: `analysis/tests/test_bursts.py`

**Step 1: Write failing test**

```python
# analysis/tests/test_bursts.py
import pytest
from datetime import datetime, timedelta
from src.detectors.bursts import detect_vouch_burst, calculate_burst_score

def test_detect_burst_in_vouches():
    # Normal activity then sudden spike
    base_time = datetime(2025, 1, 1)
    vouches = [
        {"subjectProfileId": 1, "createdAt": (base_time + timedelta(days=i)).isoformat()}
        for i in range(10)
    ]
    # Add burst: 20 vouches in one day
    burst_day = base_time + timedelta(days=15)
    for i in range(20):
        vouches.append({
            "subjectProfileId": 1,
            "createdAt": (burst_day + timedelta(hours=i)).isoformat()
        })

    has_burst, burst_size = detect_vouch_burst(vouches, profile_id=1)
    assert has_burst
    assert burst_size >= 15

def test_no_burst_normal_activity():
    base_time = datetime(2025, 1, 1)
    vouches = [
        {"subjectProfileId": 1, "createdAt": (base_time + timedelta(days=i)).isoformat()}
        for i in range(30)
    ]

    has_burst, _ = detect_vouch_burst(vouches, profile_id=1)
    assert not has_burst
```

**Step 2: Run test to fail**

```bash
python -m pytest tests/test_bursts.py -v
```

**Step 3: Implement bursts.py**

```python
# analysis/src/detectors/bursts.py
"""Detect temporal vouch bursts."""
from datetime import datetime, timedelta
from collections import defaultdict
import numpy as np
from typing import Optional

def parse_timestamp(ts: str | int | None) -> Optional[datetime]:
    """Parse various timestamp formats."""
    if ts is None:
        return None
    if isinstance(ts, int):
        return datetime.fromtimestamp(ts / 1000)  # Assume milliseconds
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None

def get_vouches_for_profile(vouches: list[dict], profile_id: int) -> list[dict]:
    """Filter vouches received by a specific profile."""
    return [v for v in vouches if v.get("subjectProfileId") == profile_id]

def group_by_window(vouches: list[dict], window_days: int = 7) -> dict[str, list]:
    """Group vouches by time window."""
    windows = defaultdict(list)

    for vouch in vouches:
        # Try different timestamp fields
        ts = None
        for field in ["createdAt", "activityCheckpoints.vouched", "timestamp"]:
            if "." in field:
                parts = field.split(".")
                val = vouch
                for p in parts:
                    val = val.get(p, {}) if isinstance(val, dict) else None
                ts = parse_timestamp(val)
            else:
                ts = parse_timestamp(vouch.get(field))
            if ts:
                break

        if ts:
            # Create window key
            window_start = ts - timedelta(days=ts.timetuple().tm_yday % window_days)
            window_key = window_start.strftime("%Y-%W")
            windows[window_key].append(vouch)

    return dict(windows)

def detect_vouch_burst(
    vouches: list[dict],
    profile_id: int,
    window_days: int = 7,
    std_threshold: float = 3.0
) -> tuple[bool, int]:
    """Detect if profile received a burst of vouches.

    Args:
        vouches: All vouch records
        profile_id: Profile to analyze
        window_days: Size of time window
        std_threshold: Standard deviations above mean to flag

    Returns:
        (has_burst, max_burst_size)
    """
    profile_vouches = get_vouches_for_profile(vouches, profile_id)

    if len(profile_vouches) < 10:
        return False, 0

    windows = group_by_window(profile_vouches, window_days)

    if len(windows) < 3:
        return False, 0

    counts = [len(v) for v in windows.values()]
    mean = np.mean(counts)
    std = np.std(counts)

    if std == 0:
        return False, 0

    max_count = max(counts)
    z_score = (max_count - mean) / std

    return z_score > std_threshold, max_count

def calculate_burst_score(vouches: list[dict], profile_id: int) -> float:
    """Calculate burst-based risk score for a profile."""
    has_burst, burst_size = detect_vouch_burst(vouches, profile_id)

    if not has_burst:
        return 0.0

    # Score based on burst size
    # Larger bursts are more suspicious
    if burst_size >= 50:
        return 100.0
    elif burst_size >= 30:
        return 80.0
    elif burst_size >= 20:
        return 60.0
    elif burst_size >= 10:
        return 40.0
    else:
        return 20.0
```

**Step 4: Run test**

```bash
python -m pytest tests/test_bursts.py -v
```

**Step 5: Commit**

```bash
git add analysis/src/detectors/bursts.py analysis/tests/test_bursts.py
git commit -m "feat: add temporal burst detector with tests"
```

---

## Task 7: Stake & Reciprocity Analyzers

**Files:**
- Create: `analysis/src/detectors/stakes.py`
- Create: `analysis/src/detectors/reciprocity.py`

**Step 1: Implement stakes.py**

```python
# analysis/src/detectors/stakes.py
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
    all_weights = [d["weight"] for u, v, d in G.edges(data=True)]
    network_avg = np.mean(all_weights) if all_weights else 0.1

    score = 0.0

    # Penalize if average stake is much lower than network
    if avg_stake < network_avg * 0.1:
        score += 50
    elif avg_stake < network_avg * 0.3:
        score += 30
    elif avg_stake < network_avg * 0.5:
        score += 15

    # Penalize if many tiny stakes
    tiny_stakes = sum(1 for s in stakes if s < 0.01)
    tiny_ratio = tiny_stakes / num_vouches

    if tiny_ratio > 0.8:
        score += 50
    elif tiny_ratio > 0.5:
        score += 30
    elif tiny_ratio > 0.3:
        score += 15

    return min(100.0, score)
```

**Step 2: Implement reciprocity.py**

```python
# analysis/src/detectors/reciprocity.py
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
```

**Step 3: Update detectors __init__.py**

```python
# analysis/src/detectors/__init__.py
from .rings import find_rings, calculate_ring_score, get_ring_stats
from .clusters import find_isolated_clusters, calculate_cluster_score
from .bursts import detect_vouch_burst, calculate_burst_score
from .stakes import calculate_stake_score
from .reciprocity import calculate_reciprocity_score

__all__ = [
    "find_rings",
    "calculate_ring_score",
    "get_ring_stats",
    "find_isolated_clusters",
    "calculate_cluster_score",
    "detect_vouch_burst",
    "calculate_burst_score",
    "calculate_stake_score",
    "calculate_reciprocity_score",
]
```

**Step 4: Commit**

```bash
git add analysis/src/detectors/
git commit -m "feat: add stake and reciprocity analyzers"
```

---

## Task 8: Risk Scorer (Composite)

**Files:**
- Create: `analysis/src/scorer.py`
- Create: `analysis/tests/test_scorer.py`

**Step 1: Implement scorer.py**

```python
# analysis/src/scorer.py
"""Composite risk scoring combining all detectors."""
import networkx as nx
from dataclasses import dataclass
from typing import Optional

from .detectors import (
    calculate_ring_score,
    calculate_cluster_score,
    calculate_burst_score,
    calculate_stake_score,
    calculate_reciprocity_score,
)

@dataclass
class RiskScore:
    """Risk score with component breakdown."""
    profile_id: int
    total_score: float
    ring_score: float
    cluster_score: float
    burst_score: float
    stake_score: float
    reciprocity_score: float
    risk_level: str
    flags: list[str]

    def to_dict(self) -> dict:
        return {
            "profile_id": self.profile_id,
            "total_score": round(self.total_score, 2),
            "risk_level": self.risk_level,
            "breakdown": {
                "ring": round(self.ring_score, 2),
                "cluster": round(self.cluster_score, 2),
                "burst": round(self.burst_score, 2),
                "stake": round(self.stake_score, 2),
                "reciprocity": round(self.reciprocity_score, 2),
            },
            "flags": self.flags
        }

# Weights for each component
WEIGHTS = {
    "ring": 0.30,
    "cluster": 0.25,
    "burst": 0.20,
    "stake": 0.15,
    "reciprocity": 0.10,
}

def get_risk_level(score: float) -> str:
    """Convert numeric score to risk level."""
    if score < 20:
        return "LOW"
    elif score < 40:
        return "MODERATE"
    elif score < 60:
        return "ELEVATED"
    elif score < 80:
        return "HIGH"
    else:
        return "CRITICAL"

def calculate_risk_score(
    G: nx.DiGraph,
    vouches: list[dict],
    profile_id: int
) -> RiskScore:
    """Calculate composite risk score for a profile.

    Args:
        G: Vouch graph
        vouches: Raw vouch data (for temporal analysis)
        profile_id: Profile to score

    Returns:
        RiskScore with breakdown
    """
    # Calculate component scores
    ring = calculate_ring_score(G, profile_id)
    cluster = calculate_cluster_score(G, profile_id)
    burst = calculate_burst_score(vouches, profile_id)
    stake = calculate_stake_score(G, profile_id)
    reciprocity = calculate_reciprocity_score(G, profile_id)

    # Weighted sum
    total = (
        ring * WEIGHTS["ring"] +
        cluster * WEIGHTS["cluster"] +
        burst * WEIGHTS["burst"] +
        stake * WEIGHTS["stake"] +
        reciprocity * WEIGHTS["reciprocity"]
    )

    # Determine flags
    flags = []
    if ring > 30:
        flags.append("RING_MEMBER")
    if cluster > 50:
        flags.append("ISOLATED_CLUSTER")
    if burst > 40:
        flags.append("VOUCH_BURST")
    if stake > 40:
        flags.append("LOW_STAKES")
    if reciprocity > 50:
        flags.append("FARMING_PATTERN")

    return RiskScore(
        profile_id=profile_id,
        total_score=min(100.0, total),
        ring_score=ring,
        cluster_score=cluster,
        burst_score=burst,
        stake_score=stake,
        reciprocity_score=reciprocity,
        risk_level=get_risk_level(total),
        flags=flags
    )

def batch_calculate_scores(
    G: nx.DiGraph,
    vouches: list[dict],
    profile_ids: Optional[list[int]] = None,
    min_vouches: int = 5
) -> list[RiskScore]:
    """Calculate risk scores for multiple profiles.

    Args:
        G: Vouch graph
        vouches: Raw vouch data
        profile_ids: Specific profiles to score (or None for all)
        min_vouches: Minimum vouches received to include

    Returns:
        List of RiskScores
    """
    if profile_ids is None:
        # Score all profiles with enough vouches
        profile_ids = [
            node for node in G.nodes()
            if G.in_degree(node) >= min_vouches
        ]

    scores = []
    for pid in profile_ids:
        try:
            score = calculate_risk_score(G, vouches, pid)
            scores.append(score)
        except Exception as e:
            print(f"Error scoring profile {pid}: {e}")

    # Sort by score descending
    scores.sort(key=lambda s: s.total_score, reverse=True)

    return scores
```

**Step 2: Commit**

```bash
git add analysis/src/scorer.py
git commit -m "feat: add composite risk scorer"
```

---

## Task 9: Main Script & Exporter

**Files:**
- Create: `analysis/src/main.py`
- Create: `analysis/src/exporter.py`

**Step 1: Implement main.py**

```python
# analysis/src/main.py
"""Main entry point for trust ring detection."""
import json
import argparse
from pathlib import Path
from tqdm import tqdm

from .loader import load_vouches, get_vouch_stats
from .graph import build_vouch_graph, get_graph_stats
from .scorer import batch_calculate_scores
from .detectors import get_ring_stats

DEFAULT_VOUCHES_PATH = "/Users/kluless/ethos-research/data/raw/vouches.json"
DEFAULT_OUTPUT_PATH = "/Users/kluless/ethos-vibeathon/analysis/outputs/risk_scores.json"

def main():
    parser = argparse.ArgumentParser(description="Trust Ring Detector")
    parser.add_argument("--vouches", default=DEFAULT_VOUCHES_PATH, help="Path to vouches.json")
    parser.add_argument("--output", default=DEFAULT_OUTPUT_PATH, help="Output path for scores")
    parser.add_argument("--top", type=int, default=100, help="Number of top profiles to analyze")
    parser.add_argument("--min-vouches", type=int, default=10, help="Minimum vouches to include")
    args = parser.parse_args()

    print("=" * 60)
    print("TRUST RING DETECTOR")
    print("=" * 60)

    # Load data
    print("\n[1/4] Loading vouch data...")
    vouches = load_vouches(args.vouches)
    stats = get_vouch_stats(vouches)
    print(f"  Loaded {stats['total_vouches']:,} vouches")
    print(f"  {stats['unique_profiles']:,} unique profiles")

    # Build graph
    print("\n[2/4] Building vouch graph...")
    G = build_vouch_graph(vouches)
    graph_stats = get_graph_stats(G)
    print(f"  {graph_stats['nodes']:,} nodes, {graph_stats['edges']:,} edges")
    print(f"  Density: {graph_stats['density']:.4f}")

    # Detect rings
    print("\n[3/4] Detecting rings...")
    ring_stats = get_ring_stats(G)
    print(f"  Found {ring_stats['total_rings']:,} rings")
    print(f"  {ring_stats['profiles_in_rings']:,} profiles in rings ({ring_stats['pct_profiles_in_rings']:.1f}%)")

    # Calculate scores
    print(f"\n[4/4] Calculating risk scores (top {args.top} profiles)...")

    # Get profiles with most vouches received
    profiles_by_vouches = sorted(
        [(n, G.in_degree(n)) for n in G.nodes()],
        key=lambda x: x[1],
        reverse=True
    )
    top_profiles = [p[0] for p in profiles_by_vouches[:args.top] if p[1] >= args.min_vouches]

    scores = batch_calculate_scores(G, vouches, top_profiles, args.min_vouches)

    # Output results
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)

    # Summary by risk level
    levels = {}
    for s in scores:
        levels[s.risk_level] = levels.get(s.risk_level, 0) + 1

    print("\nRisk Level Distribution:")
    for level in ["CRITICAL", "HIGH", "ELEVATED", "MODERATE", "LOW"]:
        count = levels.get(level, 0)
        print(f"  {level}: {count}")

    # Top flagged profiles
    print("\nTop 10 Highest Risk Profiles:")
    for i, s in enumerate(scores[:10]):
        print(f"  {i+1}. Profile {s.profile_id}: {s.total_score:.1f} ({s.risk_level})")
        if s.flags:
            print(f"     Flags: {', '.join(s.flags)}")

    # Save to JSON
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    output_data = {
        "metadata": {
            "vouches_analyzed": stats["total_vouches"],
            "profiles_scored": len(scores),
            "graph_nodes": graph_stats["nodes"],
            "graph_edges": graph_stats["edges"],
            "rings_found": ring_stats["total_rings"],
        },
        "scores": [s.to_dict() for s in scores]
    }

    with open(output_path, "w") as f:
        json.dump(output_data, f, indent=2)

    print(f"\nResults saved to: {output_path}")

if __name__ == "__main__":
    main()
```

**Step 2: Implement exporter.py (for contract deployment)**

```python
# analysis/src/exporter.py
"""Export risk scores for smart contract deployment."""
import json
from pathlib import Path
from typing import Optional

def export_for_contract(
    scores_path: str,
    output_path: str,
    max_profiles: Optional[int] = None
) -> dict:
    """Export scores in format ready for contract batch update.

    Args:
        scores_path: Path to risk_scores.json
        output_path: Output path for contract data
        max_profiles: Maximum profiles to include

    Returns:
        Contract-ready data
    """
    with open(scores_path) as f:
        data = json.load(f)

    scores = data["scores"]
    if max_profiles:
        scores = scores[:max_profiles]

    # Format for batchSetScores
    contract_data = {
        "profileIds": [],
        "scoreValues": [],
        "ringFlags": [],
        "clusterFlags": [],
        "burstFlags": [],
    }

    for s in scores:
        contract_data["profileIds"].append(s["profile_id"])
        contract_data["scoreValues"].append(int(s["total_score"]))
        contract_data["ringFlags"].append(1 if "RING_MEMBER" in s["flags"] else 0)
        contract_data["clusterFlags"].append(1 if "ISOLATED_CLUSTER" in s["flags"] else 0)
        contract_data["burstFlags"].append(1 if "VOUCH_BURST" in s["flags"] else 0)

    with open(output_path, "w") as f:
        json.dump(contract_data, f, indent=2)

    return contract_data
```

**Step 3: Commit**

```bash
git add analysis/src/main.py analysis/src/exporter.py
git commit -m "feat: add main script and contract exporter"
```

---

## Task 10: Base Smart Contract Setup

**Files:**
- Create: `contracts/package.json`
- Create: `contracts/hardhat.config.js`
- Create: `contracts/contracts/RiskRegistry.sol`
- Create: `contracts/scripts/deploy.js`

**Step 1: Initialize Hardhat project**

```bash
cd /Users/kluless/ethos-vibeathon
mkdir -p contracts
cd contracts
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox dotenv
npx hardhat init  # Select "Create an empty hardhat.config.js"
mkdir contracts scripts test
```

**Step 2: Create hardhat.config.js**

```javascript
// contracts/hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.19",
  networks: {
    baseSepolia: {
      url: "https://sepolia.base.org",
      chainId: 84532,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    base: {
      url: "https://mainnet.base.org",
      chainId: 8453,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
```

**Step 3: Create RiskRegistry.sol** (copy from ARCHITECTURE.md)

**Step 4: Create deploy.js**

```javascript
// contracts/scripts/deploy.js
const hre = require("hardhat");

async function main() {
  console.log("Deploying RiskRegistry...");

  const RiskRegistry = await hre.ethers.getContractFactory("RiskRegistry");
  const registry = await RiskRegistry.deploy();

  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log(`RiskRegistry deployed to: ${address}`);

  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    address,
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    `deployments/${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

**Step 5: Commit**

```bash
cd /Users/kluless/ethos-vibeathon
git add contracts/
git commit -m "feat: add Base smart contract setup"
```

---

## Task 11: Demo UI Setup

**Files:**
- Create: `web/` Next.js project with OnchainKit

**Step 1: Create Next.js app**

```bash
cd /Users/kluless/ethos-vibeathon
npm create onchain@latest web -- --template next
cd web
npm install vis-network
```

**Step 2: Update for our needs** (will implement core components)

**Step 3: Commit**

```bash
git add web/
git commit -m "feat: initialize Next.js demo UI with OnchainKit"
```

---

## Task 12: Run Full Analysis & Deploy

**Step 1: Run analysis on real data**

```bash
cd /Users/kluless/ethos-vibeathon/analysis
python -m src.main --top 200
```

**Step 2: Deploy contract to Base Sepolia**

```bash
cd /Users/kluless/ethos-vibeathon/contracts
npx hardhat run scripts/deploy.js --network baseSepolia
```

**Step 3: Upload scores to contract**

```bash
# Run upload script (to be created)
```

---

## Task 13: Record Demo Video

- 2-3 minutes MAX
- Show: Problem → Solution → Demo → On-chain query
- Script the key points

---

*Plan created: 2025-01-20*
