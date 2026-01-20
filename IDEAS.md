# Ethos Vibeathon Ideas

**Hackathon**: Ethos Vibeathon (Jan 2025)
**Deadline**: Thursday 6pm CST
**Prize Categories**:
- Category 1: Net new product ($2500 + year Claude Pro)
- Category 2: Reputation driven improvement ($2500 + year Claude Pro)
- Base Sponsorship: $30k paymaster credits

**Judges**: @serpinxbt, @davidtsocy, @frankdegods, @zacxbt, @marco_derossi

---

## Category 1: Net New Product

### Idea 1: Trust Ring Detector (Collusion Detection on Base)

**Problem**: Coordinated manipulation in crypto is rampant (see: Trove Markets scandal - $11.5M ICO with Polymarket manipulation, $73K trader losses, ZachXBT investigation).

**Solution**: Graph-based collusion detection using Ethos vouch network analysis, deployed on Base.

**Detection Signals (all from Ethos API)**:
- Circular vouching (A→B→C→A rings)
- Vouch bursts (sudden spikes in vouches received)
- Isolated clusters (groups that only vouch each other)
- Low-stake vouches (many small vouches vs few meaningful ones)
- Trust/Distrust ratio anomalies

**Tech Stack**:
- `ethos-py` SDK - Fetch vouch networks
- Python + networkx - Graph analysis algorithms
- Base smart contract - Store/query risk scores on-chain
- Simple frontend - Demo UI

**Novel Aspects**:
- No one's doing graph-based collusion detection on Ethos
- Brings reputation risk analysis ON-CHAIN to Base
- Timely given Trove Markets scandal

**Feasibility**: 2 days - YES (scoped to Ethos data only)

---

## Category 2: Reputation Driven Improvement

### Idea 2: Reputation-Weighted Prediction Market

**Existing Product**: Polymarket / prediction markets
**Improvement**: Weight predictions by Ethos reputation score

- High-reputation forecasters' positions count more
- Creates "smart money" signal
- Sybil-resistant by design

---

### Idea 3: Reputation-Gated Airdrop Tool

**Existing Product**: Airdrop distribution tools
**Improvement**: Filter recipients by Ethos score

- Minimum score threshold for eligibility
- Tiered allocation based on reputation
- Eliminates sybil farming

---

### Idea 4: Trust-Weighted DAO Voting

**Existing Product**: Snapshot / DAO governance
**Improvement**: Votes weighted by Ethos reputation, not just tokens

- Plutocracy → Meritocracy
- 1 token ≠ 1 vote, reputation matters
- Quadratic voting + reputation multiplier

---

### Idea 5: Wallet Reputation Overlay

**Existing Product**: Wallet apps (Rainbow, Rabby, etc.)
**Improvement**: Show Ethos reputation for any address

- Before you trade/interact, see their trust score
- Warning for low-reputation addresses
- Browser extension or API integration

---

### Idea 6: Farcaster Frame with Reputation

**Existing Product**: Farcaster social protocol
**Improvement**: Frames that gate content/actions by Ethos score

- "Only users with 1400+ score can mint"
- Reputation badges in profiles
- Trust-filtered feeds

---

## Building on Base

### Why Base?
- $30k paymaster credits for Base builders
- Fast, cheap L2 (EVM compatible)
- OnchainKit for rapid development

### Key Resources

**RPC Endpoints**:
- Mainnet: `https://mainnet.base.org`
- Sepolia Testnet: `https://sepolia.base.org`
- CDP (Coinbase): Free tier available

**Development Tools**:
- [OnchainKit](https://www.base.org/build/onchainkit) - Build onchain apps in 15 mins
- [Base Docs](https://docs.base.org/learn/welcome) - Smart contract tutorials
- Hardhat/Foundry - Contract development

**OnchainKit Features**:
- Identity (Basenames, avatars)
- Wallet (Connect Wallet)
- Transaction (EOAs or Smart Wallets)
- Checkout (USDC flows)
- Swap (Token swaps)

**Node Providers**:
| Provider | Free Tier | Notes |
|----------|-----------|-------|
| CDP (Coinbase) | Yes | Same infra as Coinbase exchange |
| Alchemy | Yes | Enhanced features, SDKs |
| QuickNode | Limited | Flashblocks support |
| Chainstack | Yes | Archive nodes available |

**Flashblocks** (Base-specific):
- 200ms confirmation vs 2s standard
- Available on mainnet and Sepolia
- Great for responsive UX

### Contract Deployment

```bash
# Quick start with OnchainKit
npm create onchain

# Or manual Hardhat setup
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
```

**Base Mainnet Config**:
```javascript
networks: {
  base: {
    url: "https://mainnet.base.org",
    chainId: 8453,
    accounts: [PRIVATE_KEY]
  }
}
```

**Base Sepolia Testnet**:
```javascript
networks: {
  baseSepolia: {
    url: "https://sepolia.base.org",
    chainId: 84532,
    accounts: [PRIVATE_KEY]
  }
}
```

---

## Our Advantages

1. **ethos-py SDK** - Ready to use, full API coverage
2. **ethos-ts-sdk** - TypeScript option, 97.78% test coverage
3. **Research methodology** - Proven vouch validation (72-88% accuracy)
4. **PM expertise** - Deep prediction market analysis background

---

## Decision Matrix

| Idea | Novelty | Feasibility (2 days) | Base Integration | Wow Factor |
|------|---------|---------------------|------------------|------------|
| Trust Ring Detector | High | Medium | Yes (on-chain scores) | High |
| Rep-Weighted PM | Medium | Medium | Yes | Medium |
| Airdrop Tool | Low | High | Yes | Low |
| DAO Voting | Medium | Medium | Yes | Medium |
| Wallet Overlay | Medium | High | Optional | Medium |
| Farcaster Frame | Medium | High | Yes | Medium |

**Recommendation**: Trust Ring Detector (Idea 1) - highest novelty, timely, showcases expertise
