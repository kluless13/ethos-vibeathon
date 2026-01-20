# Trust Ring Detector — Product Requirements Document

> **Project**: Ethos Vibeathon Entry (Category 1: Net New Product)
> **Timeline**: 2 days (Jan 20-22, 2025)
> **Goal**: Detect collusion rings in Ethos Network vouch data, deploy risk scores on Base

---

## 1. Problem Statement

### The Collusion Problem in Reputation Systems

Reputation systems are vulnerable to **coordinated manipulation** where groups of actors vouch for each other to artificially inflate credibility scores. Recent examples:

- **Trove Markets (Jan 2025)**: $11.5M ICO with coordinated Polymarket manipulation, ZachXBT investigation, $73K trader losses
- **Academic peer review**: Collusion rings achieve 30%+ success at manipulating assignments while remaining undetected
- **Airdrop farming**: Sybil clusters captured ~40% of tokens in major airdrops (Arbitrum, Aptos)

### Why This Matters for Ethos

Ethos Network's value proposition is **authentic trust signals** through staked vouches. If collusion rings can game the system:
- Trust scores become meaningless
- Legitimate users lose confidence
- The entire reputation layer is compromised

### Current Gap

- No tool exists to detect collusion patterns in Ethos vouch networks
- Risk assessment is manual and reactive
- No on-chain reputation risk scores

---

## 2. Solution Overview

**Trust Ring Detector** analyzes the Ethos vouch network graph to identify suspicious patterns and generates risk scores that are stored on Base blockchain.

### Core Value Proposition

> "Before you trust someone's Ethos score, check if they're part of a collusion ring."

### Key Features

1. **Graph-Based Detection** — Analyze vouch network topology for suspicious patterns
2. **Multi-Signal Scoring** — Combine multiple risk indicators into a single score
3. **On-Chain Risk Registry** — Store risk scores on Base for other apps to query
4. **Visual Explorer** — Demo UI to explore vouch networks and flagged patterns

---

## 3. Detection Methodology

### 3.1 Circular Vouch Detection (Rings)

**Pattern**: A → B → C → A (closed loops in vouch graph)

```
     ┌─────────┐
     │    A    │
     └────┬────┘
          │ vouches
          ▼
     ┌─────────┐
     │    B    │
     └────┬────┘
          │ vouches
          ▼
     ┌─────────┐
     │    C    │──────vouches────► A (RING!)
     └─────────┘
```

**Detection**: Cycle detection algorithms (DFS-based) on directed vouch graph

**Risk Signal**: Rings of size 3-5 are highly suspicious. Larger rings may be organic community clusters.

---

### 3.2 Isolated Cluster Detection

**Pattern**: Groups that primarily vouch within themselves, minimal external connections

```
┌─────────────────────────────┐
│  ISOLATED CLUSTER           │
│                             │
│   A ←→ B ←→ C ←→ D          │    Very few vouches
│   ↑         ↓               │    to/from outside
│   └─────────┘               │
│                             │
└─────────────────────────────┘
         │
         │ (weak connection)
         ▼
    REST OF NETWORK
```

**Detection**:
- Community detection (Louvain algorithm)
- Calculate internal vs external vouch ratio
- Flag clusters with >80% internal vouches

**Risk Signal**: High insularity = potential coordinated group

---

### 3.3 Vouch Burst Detection (Temporal)

**Pattern**: Sudden spike in vouches received in short time window

```
Vouches
   │
 20│                    ████
   │                    ████
 15│                    ████
   │                    ████
 10│                    ████
   │        ██          ████
  5│   ██   ██   ██     ████
   │   ██   ██   ██     ████
   └──────────────────────────► Time
        Normal activity  BURST!
```

**Detection**:
- Calculate vouch velocity (vouches per time window)
- Compare to baseline for profile age
- Flag anomalous spikes (>3 std dev)

**Risk Signal**: Coordinated vouch campaigns often happen in bursts

---

### 3.4 Low-Stake Pattern Detection

**Pattern**: Many small vouches vs. few meaningful stakes

```
Legitimate User:          Suspicious User:
├── Vouch: 0.5 ETH        ├── Vouch: 0.001 ETH
├── Vouch: 0.3 ETH        ├── Vouch: 0.001 ETH
├── Vouch: 0.2 ETH        ├── Vouch: 0.001 ETH
└── Vouch: 0.1 ETH        ├── Vouch: 0.001 ETH
                          ├── Vouch: 0.001 ETH
Total: 1.1 ETH (4)        └── ... (50 more)
Avg: 0.275 ETH            Total: 0.05 ETH (50)
                          Avg: 0.001 ETH
```

**Detection**:
- Calculate average stake per vouch
- Count of unique vouchers vs total stake
- Flag profiles with many low-stake vouches

**Risk Signal**: Cheap vouches suggest gaming rather than genuine trust

---

### 3.5 Reciprocity Imbalance

**Pattern**: Unusual ratio of vouches given vs received

```
Normal User:              Suspicious User:
Received: 20              Received: 100
Given: 15                 Given: 2
Ratio: 0.75               Ratio: 0.02 (RED FLAG)
```

**Detection**:
- Calculate vouch reciprocity ratio
- Compare to network median
- Flag extreme outliers

**Risk Signal**: Receiving many vouches but giving almost none suggests farming

---

## 4. Risk Score Calculation

### Composite Score (0-100)

```
RISK_SCORE = (
    ring_score * 0.30 +           # Circular vouch patterns
    cluster_score * 0.25 +        # Isolated cluster membership
    burst_score * 0.20 +          # Temporal anomalies
    stake_score * 0.15 +          # Low-stake patterns
    reciprocity_score * 0.10      # Vouch imbalance
)
```

### Risk Levels

| Score | Level | Interpretation |
|-------|-------|----------------|
| 0-20 | LOW | No suspicious patterns detected |
| 21-40 | MODERATE | Some anomalies, worth investigating |
| 41-60 | ELEVATED | Multiple risk signals present |
| 61-80 | HIGH | Strong indicators of coordination |
| 81-100 | CRITICAL | Likely collusion ring participant |

---

## 5. User Stories

### Primary Users

1. **Ethos Users** — "I want to check if someone's trust score is legitimate before I trust them"
2. **Protocol Integrators** — "I want to query on-chain risk scores to gate access in my dApp"
3. **Researchers** — "I want to explore vouch network patterns and understand trust dynamics"

### User Flows

**Flow 1: Check a Profile**
```
User enters Twitter handle or Ethos profile ID
    → System fetches vouch network
    → Runs detection algorithms
    → Returns risk score + breakdown
    → Shows flagged patterns visually
```

**Flow 2: Query On-Chain (for dApps)**
```
Smart contract calls getRiskScore(profileId)
    → Returns (score, timestamp, flags)
    → dApp uses score for gating/weighting
```

---

## 6. Success Metrics

### Hackathon Success (Thursday deadline)
- [ ] Detect rings in real Ethos data
- [ ] Generate risk scores for top 100 profiles
- [ ] Deploy contract on Base Sepolia
- [ ] Demo UI showing network visualization
- [ ] 2-3 minute video demo

### Validation
- Cross-reference with Twitter validation methodology (from ethos-research)
- Profiles flagged as suspicious should have lower Twitter interaction rates

---

## 7. Out of Scope (Future Work)

- Real-time monitoring / alerts
- Historical trend analysis
- Integration with other reputation systems
- Machine learning classification
- Automated on-chain updates

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| False positives | Legitimate users flagged | Conservative thresholds, multiple signals required |
| Graph too large | Performance issues | Sample top profiles, batch processing |
| Data staleness | Outdated risk scores | Timestamp all scores, note freshness |
| Contract bugs | Incorrect on-chain data | Simple storage pattern, thorough testing |

---

## 9. References

- [Ethos Research - Vouch Validation](../ethos-research/README.md) — 72-88% of vouches correlate with real Twitter relationships
- [Trove Markets Scandal](https://cryptonews.com/news/trove-markets-sale-polymarket-manipulation-claims/) — Real-world collusion example
- [Collusion Ring Detection Research](https://arxiv.org/abs/2402.07860) — Academic approaches to ring detection
- [Sybil Resistance in Airdrops](https://medium.com/holonym/sybil-resistant-airdrops-023710717413) — Industry patterns

---

*Document created: 2025-01-20*
*Last updated: 2025-01-20*
