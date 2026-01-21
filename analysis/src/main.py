"""Main analysis script for Trust Ring Detector."""

import json
import csv
from datetime import datetime
from pathlib import Path
from typing import Optional

from tqdm import tqdm

from .loader import load_vouches, get_vouch_stats
from .graph import build_vouch_graph, get_graph_stats
from .scorer import analyze_all_profiles, get_network_summary, get_high_risk_profiles
from .detectors import get_ring_stats, find_isolated_clusters


def run_analysis(
    vouches_path: str | Path,
    output_dir: str | Path = "outputs",
    risk_threshold: float = 30.0,
) -> dict:
    """Run full collusion detection analysis.

    Args:
        vouches_path: Path to vouches.json
        output_dir: Directory for output files
        risk_threshold: Minimum score to flag as risky

    Returns:
        Analysis results dict
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print("=" * 60)
    print("TRUST RING DETECTOR - Ethos Collusion Analysis")
    print("=" * 60)

    # Step 1: Load vouches
    print("\n[1/5] Loading vouches...")
    vouches = load_vouches(vouches_path)
    vouch_stats = get_vouch_stats(vouches)
    print(f"  Loaded {vouch_stats['total_vouches']:,} vouches")
    print(f"  Unique vouchers: {vouch_stats['unique_vouchers']:,}")
    print(f"  Unique subjects: {vouch_stats['unique_subjects']:,}")

    # Step 2: Build graph
    print("\n[2/5] Building vouch graph...")
    G = build_vouch_graph(vouches)
    graph_stats = get_graph_stats(G)
    print(f"  Nodes (profiles): {graph_stats['nodes']:,}")
    print(f"  Edges (vouches): {graph_stats['edges']:,}")
    print(f"  Avg in-degree: {graph_stats['avg_in_degree']:.2f}")

    # Step 3: Detect patterns
    print("\n[3/5] Detecting patterns...")
    ring_stats = get_ring_stats(G, max_length=5)
    print(f"  Rings found: {ring_stats['total_rings']:,}")
    print(f"  Profiles in rings: {ring_stats['profiles_in_rings']:,}")
    print(f"  Ring sizes: {ring_stats['rings_by_size']}")

    isolated_clusters = find_isolated_clusters(G, insularity_threshold=0.8)
    print(f"  Isolated clusters: {len(isolated_clusters)}")

    # Step 4: Score all profiles
    print("\n[4/5] Scoring profiles...")
    print("  This may take a while for large networks...")
    results = analyze_all_profiles(G, vouches)
    summary = get_network_summary(G, results)

    print(f"\n  Risk Distribution:")
    for level, count in summary["risk_distribution"].items():
        pct = summary["risk_percentages"][level]
        print(f"    {level.upper()}: {count:,} ({pct}%)")

    print(f"\n  Average risk score: {summary['avg_risk_score']}")

    # Step 5: Export results
    print("\n[5/5] Exporting results...")

    # Export all profiles
    all_profiles_path = output_dir / f"all_profiles_{timestamp}.json"
    with open(all_profiles_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"  All profiles: {all_profiles_path}")

    # Export high-risk profiles
    high_risk = get_high_risk_profiles(results, threshold=risk_threshold)
    high_risk_path = output_dir / f"high_risk_{timestamp}.json"
    with open(high_risk_path, "w") as f:
        json.dump(high_risk, f, indent=2)
    print(f"  High-risk profiles: {high_risk_path} ({len(high_risk)} profiles)")

    # Export CSV for spreadsheet analysis
    csv_path = output_dir / f"risk_scores_{timestamp}.csv"
    export_csv(results, csv_path)
    print(f"  CSV export: {csv_path}")

    # Export summary
    summary_data = {
        "timestamp": timestamp,
        "vouch_stats": vouch_stats,
        "graph_stats": graph_stats,
        "ring_stats": {
            "total_rings": ring_stats["total_rings"],
            "profiles_in_rings": ring_stats["profiles_in_rings"],
            "rings_by_size": ring_stats["rings_by_size"],
        },
        "isolated_clusters_count": len(isolated_clusters),
        "network_summary": summary,
        "risk_threshold": risk_threshold,
        "high_risk_count": len(high_risk),
    }
    summary_path = output_dir / f"summary_{timestamp}.json"
    with open(summary_path, "w") as f:
        json.dump(summary_data, f, indent=2)
    print(f"  Summary: {summary_path}")

    # Export rings list
    rings_path = output_dir / f"rings_{timestamp}.json"
    with open(rings_path, "w") as f:
        json.dump(ring_stats["rings"][:1000], f, indent=2)  # Cap at 1000
    print(f"  Rings: {rings_path}")

    print("\n" + "=" * 60)
    print("ANALYSIS COMPLETE")
    print("=" * 60)

    return summary_data


def export_csv(results: list[dict], path: Path) -> None:
    """Export results to CSV."""
    if not results:
        return

    fieldnames = [
        "profile_id",
        "composite_score",
        "risk_level",
        "ring_score",
        "cluster_score",
        "burst_score",
        "stake_score",
        "reciprocity_score",
    ]

    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in results:
            writer.writerow({k: r.get(k, "") for k in fieldnames})


def export_for_contract(results: list[dict], path: Path, threshold: float = 30.0) -> None:
    """Export high-risk profiles in format for smart contract upload.

    Exports:
    - profile_id (as integer)
    - composite_score (as integer 0-100)
    """
    high_risk = [r for r in results if r["composite_score"] >= threshold]

    # Format for contract: array of [profile_id, score]
    contract_data = [
        [r["profile_id"], int(r["composite_score"])]
        for r in high_risk
    ]

    with open(path, "w") as f:
        json.dump(contract_data, f)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Trust Ring Detector")
    parser.add_argument(
        "vouches_path",
        help="Path to vouches.json",
    )
    parser.add_argument(
        "-o", "--output",
        default="outputs",
        help="Output directory (default: outputs)",
    )
    parser.add_argument(
        "-t", "--threshold",
        type=float,
        default=30.0,
        help="Risk threshold (default: 30.0)",
    )

    args = parser.parse_args()

    run_analysis(
        vouches_path=args.vouches_path,
        output_dir=args.output,
        risk_threshold=args.threshold,
    )
