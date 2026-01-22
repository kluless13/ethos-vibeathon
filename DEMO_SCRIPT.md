# Trust Ring Detector - Demo Script

## Opening Hook (10 seconds)

> "How do you trust who to trust?"
>
> Ethos lets you vouch for people you believe in. But what happens when bad actors game the system?

## The Problem (20 seconds)

> "We found 10,000 collusion rings in Ethos - groups where A vouches for B, B vouches for C, and C vouches back for A. Fake trust, real consequences.
>
> Remember Trove Markets? $11.5M raised through coordinated reputation pumping. $73K in trader losses."

## The Solution (30 seconds)

> "Trust Ring Detector uses graph analysis to catch them."
>
> **Show the search UI:**
> 1. Type "6om6oni" - shows composite score of 54 (high risk), member of 1000+ rings
> 2. Type "vitalik" - shows minimal risk, healthy vouch patterns
>
> **Show the dashboard:**
> - 491 high-risk profiles detected
> - Ring distribution chart
> - Network graph visualization

## How It Works (15 seconds)

> "Five signals, one score:"
> - Ring detection (circular vouches)
> - Cluster analysis (isolated groups)
> - Burst detection (unusual timing)
> - Stake patterns (gaming the economics)
> - Reciprocity (lopsided trust flows)
>
> "Weighted composite score 0-100. Above 30 = flagged."

## On-Chain Integration (20 seconds)

> "And here's what makes it useful for the whole ecosystem."
>
> **Show Basescan contract:**
> `0x12E98FB4ec93c7e61ef4B8A81D29ADD0a626E8Cd`
>
> "All 491 high-risk profiles are stored on Base. Any dApp can query this:"
>
> ```
> riskRegistry.isHighRisk(profileId) // true/false
> riskRegistry.getRiskScore(profileId) // 0-100
> ```
>
> "Gate your airdrops, weight your votes, warn before interactions."

## Farcaster Mini App (10 seconds)

> "And for everyday users - check anyone directly in Warpcast."
>
> **Demo the Mini App:**
> - Search "serpinxbt" - shows Ethos CEO with medium risk (32)
> - "Even the CEO has some ring connections - that's the reality of social graphs"

## Built With Our SDKs (10 seconds)

> "We built this with SDKs we created for Ethos:"
> - `ethos-ts-sdk` on npm (TypeScript, 97% test coverage)
> - `ethos-py` on PyPI (Python, for bulk analysis)
>
> "Dogfooding our own tools to catch manipulation."

## Closing (10 seconds)

> "Trust Ring Detector: Graph-based collusion detection for Ethos, on-chain risk scores on Base, Mini App for Farcaster."
>
> "Because the best reputation systems are the ones that can't be gamed."

---

## Technical Notes for Q&A

**Algorithm caveats (first iteration):**
- Current weighting is heuristic-based, not ML-trained
- False positives possible for legitimate mutual vouches
- Ring membership doesn't mean guilt - it's a signal to investigate
- Scores should inform, not automate decisions

**Contract details:**
- Address: `0x12E98FB4ec93c7e61ef4B8A81D29ADD0a626E8Cd`
- Network: Base Mainnet (Chain ID 8453)
- Functions: `getRiskScore()`, `isHighRisk()`, `getRiskLevel()`, `getBatchRiskScores()`

**Data scale:**
- 53,400+ vouches analyzed
- 5,800+ profiles indexed
- 10,000 rings detected
- 491 profiles flagged (score >= 30)

**Why serpinxbt has score 32:**
- CEO is highly connected = more ring exposure
- 1000+ ring connections detected
- Medium risk doesn't mean bad actor - it means "investigate"
- Demonstrates algorithm catches patterns regardless of status
