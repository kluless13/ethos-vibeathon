# Trust Ring Detector

**Collusion detection for Ethos Network's reputation system**

Built for [Ethos Vibeathon](https://ethos.network) (Jan 2026) | Category 1: Net New Product

[Live Demo](https://ethos-vibeathon.vercel.app) | [Farcaster Mini App](https://ethos-vibeathon.vercel.app/miniapp) | [Demo Video](https://www.loom.com/share/4d49d574fc8c4ef1b39035f4fa2b1f53)

---

## The Problem

Reputation systems are only as good as their integrity. When Ethos Network lets users stake ETH to vouch for others' trustworthiness, bad actors can game it:

- **Collusion rings**: A vouches for B, B vouches for C, C vouches back for A
- **Coordinated bursts**: 50 vouches in 48 hours vs organic growth
- **Sybil clusters**: Isolated groups that only vouch internally
- **Stake gaming**: Many tiny vouches instead of meaningful stakes

**Real-world damage**: The Trove Markets scandal saw $11.5M ICO manipulation through coordinated reputation pumping, resulting in $73K trader losses (ZachXBT investigation).

---

## The Solution

Trust Ring Detector uses **graph-based analysis** to detect manipulation patterns in Ethos vouch networks. We analyze 53,400+ vouches across 5,800+ profiles using 5 complementary detection signals.

### Detection Signals

| Signal | Weight | What It Catches |
|--------|--------|-----------------|
| **Ring Detection** | 30% | Circular vouching (A→B→C→A) |
| **Cluster Analysis** | 25% | Isolated groups (>70% internal vouches) |
| **Burst Detection** | 20% | Temporal anomalies (z-score > 3 std dev) |
| **Stake Analysis** | 15% | Low-stake farming (<0.01 ETH vouches) |
| **Reciprocity Score** | 10% | One-way trust flows (receive but never vouch) |

### Composite Risk Score

```
RISK = ring×0.30 + cluster×0.25 + burst×0.20 + stake×0.15 + reciprocity×0.10
```

- **0-20**: Minimal risk
- **21-40**: Low risk
- **41-60**: Medium risk (investigate)
- **61-80**: High risk (strong coordination signals)
- **81-100**: Critical (likely collusion member)

---

## Built With Our Own SDKs

This project dogfoods SDKs we built for Ethos:

### ethos-ts-sdk (TypeScript)

```bash
npm install ethos-ts-sdk
```

```typescript
import { Ethos } from 'ethos-ts-sdk';

const ethos = new Ethos();

// Get profile by X/Twitter handle
const profile = await ethos.profiles.getByTwitter('vitalik');

console.log(profile.score);           // 1847
console.log(profile.scoreLevel);      // 'exemplary'
console.log(profile.vouchesReceivedCount);  // 847
```

- [ethos-ts-sdk on npm](https://www.npmjs.com/package/ethos-ts-sdk)
- [ethos-ts-sdk on GitHub](https://github.com/kluless13/ethos-ts-sdk)
- 97.78% test coverage

### ethos-py (Python)

```bash
pip install ethos-py
```

```python
from ethos import Ethos

ethos = Ethos()

# Get all vouches for analysis
vouches = ethos.vouches.list(limit=1000)
profile = ethos.profiles.get_by_twitter('serpinxbt')

print(profile.score)  # 1404
```

- [ethos-py on PyPI](https://pypi.org/project/ethos-py/)
- [ethos-py on GitHub](https://github.com/kluless13/ethos-py)
- Used for bulk data fetching in analysis pipeline

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ETHOS VOUCH DATA (53,400 records)            │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              ANALYSIS ENGINE (Python + NetworkX)                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Rings     │  │  Clusters   │  │   Bursts    │              │
│  │  (DFS)      │  │ (Louvain)   │  │ (Z-score)   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│  ┌─────────────┐  ┌─────────────┐                               │
│  │   Stakes    │  │ Reciprocity │                               │
│  │ (Avg ETH)   │  │  (Ratio)    │                               │
│  └─────────────┘  └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   BASE CHAIN    │  │    WEB UI       │  │  FARCASTER      │
│  RiskRegistry   │  │  Next.js 14     │  │  Mini App       │
│  (Solidity)     │  │  + ethos-ts-sdk │  │  + SDK          │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## On-Chain Integration

Risk scores are stored on **Base** for other dApps to query:

### Contract: RiskRegistry.sol

**Deployed**: `0x12E98FB4ec93c7e61ef4B8A81D29ADD0a626E8Cd` (Base Mainnet)

```solidity
// Query a profile's risk score (0-100)
function getRiskScore(uint256 profileId) external view returns (uint8);

// Check if profile is flagged as high risk
function isHighRisk(uint256 profileId) external view returns (bool);

// Get categorical risk level (0=minimal, 1=low, 2=medium, 3=high, 4=critical)
function getRiskLevel(uint256 profileId) external view returns (uint8);

// Batch query
function getBatchRiskScores(uint256[] calldata profileIds) external view returns (uint8[] memory);
```

### Use Cases for dApps

```solidity
// Gate access to high-trust-only features
require(!riskRegistry.isHighRisk(ethosProfileId), "High risk profile");

// Weight votes by reputation cleanliness
uint256 voteWeight = 100 - riskRegistry.getRiskScore(profileId);

// Show warning before interaction
if (riskRegistry.getRiskLevel(targetId) >= 2) {
    emit TrustWarning(targetId, "Medium+ collusion risk detected");
}
```

### Query via RPC (curl/cast)

```bash
# Get risk score for profile ID 12928 (returns 54)
cast call 0x12E98FB4ec93c7e61ef4B8A81D29ADD0a626E8Cd \
  "getRiskScore(uint256)(uint8)" 12928 --rpc-url https://mainnet.base.org

# Check if profile is high risk (returns true for score >= 30)
cast call 0x12E98FB4ec93c7e61ef4B8A81D29ADD0a626E8Cd \
  "isHighRisk(uint256)(bool)" 12928 --rpc-url https://mainnet.base.org

# Get risk level (0=minimal, 1=low, 2=medium, 3=high, 4=critical)
cast call 0x12E98FB4ec93c7e61ef4B8A81D29ADD0a626E8Cd \
  "getRiskLevel(uint256)(uint8)" 12928 --rpc-url https://mainnet.base.org
```

### Query via ethers.js/viem

```typescript
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({ chain: base, transport: http() });

const riskScore = await client.readContract({
  address: '0x12E98FB4ec93c7e61ef4B8A81D29ADD0a626E8Cd',
  abi: [{ name: 'getRiskScore', type: 'function', inputs: [{ type: 'uint256' }], outputs: [{ type: 'uint8' }] }],
  functionName: 'getRiskScore',
  args: [12928n]
});

console.log(`Risk score: ${riskScore}`); // 54
```

---

## Farcaster Integration

### Mini App

Check trust scores directly in Farcaster:

1. Open the Mini App in Warpcast
2. Enter an X/Twitter handle
3. See Ethos score + collusion risk analysis
4. Fuzzy search autocomplete from 5,800+ indexed profiles

**URL**: `https://ethos-vibeathon.vercel.app/miniapp`

### Cast Embeds

Share profile lookups as rich embeds in casts - clicking opens the Mini App directly.

### Future: Chrome Extension

Similar to how Ethos has a Chrome extension for X/Twitter trust scores, we could build one for **Farcaster** that shows:

- Ethos score badge on profiles
- Collusion risk indicator
- Quick lookup without leaving the feed

This would mirror the existing X extension experience for Farcaster users.

---

## Project Structure

```
ethos-vibeathon/
├── analysis/               # Python collusion detection
│   ├── src/
│   │   ├── detectors/     # 5 detection algorithms
│   │   │   ├── rings.py       # DFS cycle detection
│   │   │   ├── clusters.py    # Louvain community detection
│   │   │   ├── bursts.py      # Temporal z-score analysis
│   │   │   ├── stakes.py      # Stake amount patterns
│   │   │   └── reciprocity.py # Vouch ratio analysis
│   │   ├── graph.py       # NetworkX graph builder
│   │   ├── scorer.py      # Weighted composite scoring
│   │   └── main.py        # Pipeline orchestration
│   └── outputs/           # Generated risk data
│
├── contracts/             # Solidity smart contract
│   └── RiskRegistry.sol   # On-chain risk score storage
│
└── ui/                    # Next.js 14 frontend
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx       # Main search UI
    │   │   ├── miniapp/       # Farcaster Mini App
    │   │   └── api/           # Frame + API routes
    │   └── lib/
    │       └── ethos.ts       # ethos-ts-sdk integration
    └── public/
        └── data/              # Precomputed risk scores
```

---

## Getting Started

### Run Analysis

```bash
cd analysis
pip install -r requirements.txt

# Analyze vouch data
python src/main.py path/to/vouches.json -o outputs -t 30

# Outputs:
# - outputs/profiles_full.json (all 5,847 profiles with scores)
# - outputs/high_risk.json (profiles above threshold)
# - outputs/rings.json (detected collusion rings)
```

### Run Web UI

```bash
cd ui
npm install
npm run dev

# Open http://localhost:3000
```

### Deploy Contract

```bash
cd contracts
forge build
forge script script/Deploy.s.sol --broadcast --network base
```

---

## Algorithm Details

### Ring Detection (30% weight)

Uses depth-first search to find cycles of length 3-5:

```python
def find_rings(G, max_size=5):
    """DFS-based cycle detection on vouch graph"""
    rings = []
    for node in high_degree_nodes(G):  # Start from likely ring members
        for cycle in nx.simple_cycles(G):
            if len(cycle) <= max_size:
                rings.append(cycle)
    return rings
```

**Scoring**: 3-node rings = +40pts, 4-node = +30pts, 5-node = +20pts (capped at 100)

### Cluster Detection (25% weight)

Louvain community detection on undirected vouch graph:

```python
def find_clusters(G, insularity_threshold=0.7):
    """Find isolated communities that only vouch internally"""
    communities = community.louvain_communities(G.to_undirected())

    for comm in communities:
        internal = edges_within(G, comm)
        external = edges_outside(G, comm)
        insularity = internal / (internal + external)

        if insularity > threshold:
            yield comm, insularity
```

### Burst Detection (20% weight)

Time-windowed z-score analysis:

```python
def detect_bursts(vouches, profile_id, window_days=7):
    """Flag unusual spikes in vouches received"""
    weekly_counts = group_by_week(vouches)
    z_scores = zscore(weekly_counts)

    return [w for w, z in zip(weekly_counts, z_scores) if z > 3]
```

---

## Results

From analyzing the Ethos network (53,400+ vouches, 5,800+ profiles):

- **10,000** collusion rings detected (3-5 node cycles)
- **744** profiles involved in at least one ring
- **491** profiles flagged as medium+ risk (score ≥ 30)
- **7** official accounts whitelisted (ethos, serpinxbt, etc.)

All 491 high-risk profiles are stored on-chain at the RiskRegistry contract on Base.

---

## Contributing

This is a hackathon project but contributions welcome:

1. Fork the repo
2. Create feature branch
3. Add tests for new detectors
4. Submit PR

### Ideas for Improvement

- [ ] Machine learning classifier (replace weighted scoring)
- [ ] Real-time monitoring (webhook on new vouches)
- [ ] Cross-chain reputation aggregation
- [ ] Farcaster Chrome extension for trust badges
- [ ] Historical trend analysis (risk score over time)

---

## License

MIT

---

## Team

Built by [@onetrillionx](https://x.com/onetrillionx) for Ethos Vibeathon

**Contact**: [X/Twitter](https://x.com/onetrillionx) | [Telegram](https://t.me/onetrillionx)

---

## Acknowledgments

- [Ethos Network](https://ethos.network) for the reputation infrastructure
- [Base](https://base.org) for L2 deployment ($30k paymaster credits)
- [Farcaster](https://farcaster.xyz) for Mini App SDK
- [ZachXBT](https://x.com/zachxbt) for Trove Markets investigation that inspired this
