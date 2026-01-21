# Ethos Trust Frame - Product Requirements Document

## Category 2: Reputation-Driven Improvement

**Hackathon**: Ethos Vibeathon
**Deadline**: Thursday 6pm CST
**Prize**: $1,500 + Year of Claude Pro

---

## Problem Statement

Ethos reputation data is siloed. Users can only check credibility scores via:
- Ethos website (requires leaving current context)
- Chrome extension (Twitter/X only)

Meanwhile, Farcaster has 70k+ active users making trust decisions daily:
- Who should I follow?
- Is this person legit?
- Should I engage with this cast?

**The gap**: No way to check Ethos reputation within Farcaster.

Ethos themselves stated: *"You will see Ethos scores everywhere – on Telegram, Discord, Farcaster..."* - but Farcaster integration is **NOT BUILT**.

---

## Solution: Ethos Trust Frame

A Farcaster Frame that surfaces Ethos reputation data directly in the Farcaster feed.

### User Experience

**Scenario 1: Check a user before following**
```
┌─────────────────────────────────────────────────┐
│  🔍 Ethos Trust Check                           │
│                                                 │
│  Enter Farcaster username or X handle:          │
│  ┌─────────────────────────────────────────┐   │
│  │ @vitalik.eth                            │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│            [ Check Trust Score ]                │
└─────────────────────────────────────────────────┘
```

**Scenario 2: View results**
```
┌─────────────────────────────────────────────────┐
│  ✅ @vitalik.eth                                │
│                                                 │
│     ████████████████████░░░░  1,847            │
│     TRUSTED                   Ethos Score       │
│                                                 │
│  📊 847 vouches received                        │
│  💰 12.4 ETH staked on them                     │
│  🔗 No suspicious patterns detected             │
│                                                 │
│  [ View on Ethos ]  [ Check Another ]           │
└─────────────────────────────────────────────────┘
```

**Scenario 3: Suspicious profile detected**
```
┌─────────────────────────────────────────────────┐
│  ⚠️ @suspicious_user                            │
│                                                 │
│     ████░░░░░░░░░░░░░░░░░░░░  412              │
│     CAUTION                   Ethos Score       │
│                                                 │
│  🔴 Part of 3 vouch rings                       │
│  🔴 Low-stake vouches (avg 0.002 ETH)           │
│  🟡 In isolated cluster                         │
│                                                 │
│  [ View Details ]  [ Check Another ]            │
└─────────────────────────────────────────────────┘
```

---

## Features

### MVP (Hackathon Scope)

| Feature | Description |
|---------|-------------|
| Username lookup | Search by X handle or Farcaster username |
| Score display | Show Ethos credibility score (0-2800) |
| Trust level | TRUSTED / NEUTRAL / CAUTION / UNTRUSTED |
| Basic stats | Vouches received, ETH staked |
| Risk flags | Surface Trust Ring Detector findings |
| Deep link | Link to full Ethos profile |

### Post-Hackathon

- Vouch directly from Frame
- Compare two profiles
- Leaderboard of most trusted Farcaster users
- Notifications when someone you follow gets flagged

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Farcaster Client                      │
│                    (Warpcast, etc.)                      │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Ethos Trust Frame                       │
│                  (Next.js + Frames v2)                   │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Frame Routes │  │ Image Gen    │  │ API Handlers │  │
│  │ /api/frame   │  │ (satori)     │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Ethos API   │  │ Trust Ring   │  │ Farcaster    │
│  (Scores,    │  │ Detector     │  │ Hub API      │
│   Vouches)   │  │ (Risk Data)  │  │ (Username)   │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| Frame SDK | Farcaster Frames v2 |
| Image Gen | Satori + Resvg |
| Styling | Tailwind CSS |
| API Client | ethos-ts-sdk (our SDK!) |
| Deployment | Vercel |
| Chain | Base (for any on-chain features) |

---

## API Integration

### Ethos API (via ethos-ts-sdk)

```typescript
import { EthosClient } from 'ethos-ts-sdk';

// Get profile by X handle
const profile = await ethos.profiles.getByTwitterHandle('vitalik');

// Get credibility score
const score = profile.score; // 0-2800

// Get vouches
const vouches = await ethos.vouches.getBySubject(profile.id);
```

### Trust Ring Detector Integration

```typescript
// Check if profile has risk flags
const riskData = await fetch('/data/all_profiles.json');
const profileRisk = riskData.find(p => p.profile_id === profile.id);

if (profileRisk?.composite_score >= 30) {
  // Show warning
}
```

### Farcaster Hub API

```typescript
// Resolve Farcaster username to custody address
const user = await fetch(`https://hub.farcaster.xyz/v1/userByUsername?username=${fname}`);
// Then lookup Ethos profile by connected address
```

---

## Frame Flow

```
1. User sees Frame in Farcaster feed
              │
              ▼
2. User enters username to check
              │
              ▼
3. Frame server:
   - Resolves username → Ethos profile
   - Fetches score, vouches, risk data
   - Generates result image
              │
              ▼
4. User sees trust score + warnings
              │
              ▼
5. User can:
   - View full profile on Ethos
   - Check another user
   - Share Frame with others
```

---

## Frame Specification (Frames v2)

### Initial Frame
```html
<meta property="fc:frame" content="vNext" />
<meta property="fc:frame:image" content="https://ethos-frame.vercel.app/api/og/start" />
<meta property="fc:frame:input:text" content="Enter X handle or Farcaster username" />
<meta property="fc:frame:button:1" content="Check Trust Score" />
<meta property="fc:frame:post_url" content="https://ethos-frame.vercel.app/api/frame/check" />
```

### Result Frame
```html
<meta property="fc:frame" content="vNext" />
<meta property="fc:frame:image" content="https://ethos-frame.vercel.app/api/og/result?user=vitalik" />
<meta property="fc:frame:button:1" content="View on Ethos" />
<meta property="fc:frame:button:1:action" content="link" />
<meta property="fc:frame:button:1:target" content="https://app.ethos.network/profile/x/vitalik" />
<meta property="fc:frame:button:2" content="Check Another" />
<meta property="fc:frame:post_url" content="https://ethos-frame.vercel.app/api/frame/reset" />
```

---

## File Structure

```
ethos-frame/
├── app/
│   ├── api/
│   │   ├── frame/
│   │   │   ├── route.ts          # Initial frame
│   │   │   ├── check/route.ts    # Handle lookup
│   │   │   └── reset/route.ts    # Reset to start
│   │   └── og/
│   │       ├── start/route.tsx   # Start image
│   │       └── result/route.tsx  # Result image
│   ├── page.tsx                  # Landing page
│   └── layout.tsx
├── lib/
│   ├── ethos.ts                  # Ethos API client
│   ├── farcaster.ts              # Farcaster hub client
│   └── risk.ts                   # Trust Ring Detector data
├── public/
│   └── data/                     # Pre-computed risk data
├── package.json
└── vercel.json
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Frame loads | < 2 seconds |
| Lookup works | 95%+ of Ethos profiles findable |
| Risk flags | Surfaces Trust Ring Detector data |
| Mobile UX | Works in Warpcast mobile app |

---

## Timeline

| Task | Time |
|------|------|
| Frame scaffold (Next.js + Frames v2) | 1 hour |
| Ethos API integration | 1 hour |
| Image generation (Satori) | 2 hours |
| Risk data integration | 1 hour |
| Testing in Warpcast playground | 1 hour |
| Deploy to Vercel | 30 min |
| **Total** | **~6-7 hours** |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Ethos API rate limits | Cache responses, use our pre-fetched data |
| Username resolution fails | Fallback to "Profile not found" gracefully |
| Frame image generation slow | Pre-compute common profiles |
| Farcaster username ≠ X handle | Support both, prioritize X handle |

---

## Why This Wins Category 2

1. **Fills stated Ethos gap** - They said they want Farcaster integration
2. **Novel** - No Ethos Frame exists today
3. **Useful** - 70k+ Farcaster users can now check trust
4. **Integrates our Category 1** - Surfaces Trust Ring Detector findings
5. **Deployed on Base** - Uses Base infrastructure

---

## Demo Script (2 min)

1. **Problem** (15 sec): "You're on Farcaster, someone follows you - are they legit?"

2. **Solution** (15 sec): "Ethos Trust Frame - check reputation without leaving Farcaster"

3. **Demo** (60 sec):
   - Show Frame in Warpcast
   - Type a username
   - See trust score + vouches
   - Show a risky profile with warnings
   - Click through to Ethos

4. **Tech** (20 sec): "Built with Frames v2, ethos-ts-sdk, Trust Ring Detector data, deployed on Vercel"

5. **Close** (10 sec): "Bringing Ethos reputation to where users already are - Farcaster"
