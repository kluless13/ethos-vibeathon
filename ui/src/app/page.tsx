"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";

type Profile = {
  profile_id: number;
  username: string | null;
  display_name: string | null;
  ethos_score: number | null;
  farcaster_id: string | null;
  ring_score: number;
  cluster_score: number;
  burst_score: number;
  stake_score: number;
  reciprocity_score: number;
  composite_score: number;
  risk_level: string;
};

type Ring = {
  profile_id: number;
  username: string | null;
  display_name: string | null;
}[];

type Summary = {
  vouch_stats: { total_vouches: number };
  graph_stats: { nodes: number; edges: number };
  ring_stats: { total_rings: number; profiles_in_rings: number; rings_by_size: Record<string, number> };
  network_summary: { risk_distribution: Record<string, number>; avg_risk_score: number };
  high_risk_count: number;
};

// Official/verified project accounts
const OFFICIAL_ACCOUNTS: Record<string, { name: string; type: "project" | "protocol" | "verified" }> = {
  megaeth: { name: "MegaETH", type: "project" },
  megaethlabs: { name: "MegaETH Labs", type: "project" },
  ethosnetwork: { name: "Ethos Network", type: "protocol" },
  etaborase: { name: "Ethos", type: "protocol" },
  base: { name: "Base", type: "protocol" },
  coinbase: { name: "Coinbase", type: "protocol" },
  optimism: { name: "Optimism", type: "protocol" },
  arbitrum: { name: "Arbitrum", type: "protocol" },
  jessepollak: { name: "Jesse Pollak", type: "verified" },
};

const isOfficialAccount = (username: string | null): boolean => {
  if (!username) return false;
  return username.toLowerCase() in OFFICIAL_ACCOUNTS;
};

const getOfficialInfo = (username: string | null) => {
  if (!username) return null;
  return OFFICIAL_ACCOUNTS[username.toLowerCase()] || null;
};

// Collusion pattern explanations
const PATTERN_INFO = {
  ring: {
    title: "Vouch Rings",
    description: "Circular vouching where A vouches for B, B vouches for C, and C vouches back to A. This inflates credibility scores artificially.",
    icon: "🔄",
    visual: "A → B → C → A",
  },
  cluster: {
    title: "Isolated Clusters",
    description: "Groups that only vouch within themselves, creating echo chambers disconnected from the broader network.",
    icon: "🏝️",
    visual: "Tight-knit groups",
  },
  burst: {
    title: "Vouch Bursts",
    description: "Sudden spikes in received vouches over a short time window, often indicating coordinated campaigns.",
    icon: "📈",
    visual: "Time-based spikes",
  },
  stake: {
    title: "Low-Stake Vouches",
    description: "Receiving many vouches with minimal ETH staked. Real trust usually comes with real stake.",
    icon: "💸",
    visual: "Quantity over quality",
  },
  reciprocity: {
    title: "Vouch Farming",
    description: "Profiles that receive many vouches but rarely give them back. Often indicates reputation farming.",
    icon: "📥",
    visual: "One-way flow",
  },
};

const RISK_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; icon: string }> = {
  critical: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", label: "CRITICAL", icon: "🚨" },
  high: { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", label: "HIGH RISK", icon: "⚠️" },
  medium: { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", label: "CAUTION", icon: "⚡" },
  low: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "LOW RISK", icon: "ℹ️" },
  minimal: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "TRUSTED", icon: "✓" },
};

function AnimatedRing() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF4000" />
          <stop offset="100%" stopColor="#ff6b35" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Outer rotating ring */}
      <g className="animate-[spin_20s_linear_infinite]" style={{ transformOrigin: '100px 100px' }}>
        <circle cx="100" cy="100" r="80" fill="none" stroke="url(#ringGrad)" strokeWidth="1" strokeDasharray="10 5" opacity="0.3" />
      </g>

      {/* Middle rotating ring (opposite direction) */}
      <g className="animate-[spin_15s_linear_infinite_reverse]" style={{ transformOrigin: '100px 100px' }}>
        <circle cx="100" cy="100" r="60" fill="none" stroke="url(#ringGrad)" strokeWidth="1.5" strokeDasharray="8 4" opacity="0.5" />
      </g>

      {/* Inner nodes */}
      <g filter="url(#glow)">
        <circle cx="100" cy="40" r="12" fill="#111" stroke="#FF4000" strokeWidth="2">
          <animate attributeName="r" values="12;14;12" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="152" cy="130" r="12" fill="#111" stroke="#FF4000" strokeWidth="2">
          <animate attributeName="r" values="12;14;12" dur="2s" begin="0.6s" repeatCount="indefinite" />
        </circle>
        <circle cx="48" cy="130" r="12" fill="#111" stroke="#FF4000" strokeWidth="2">
          <animate attributeName="r" values="12;14;12" dur="2s" begin="1.2s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* Connecting arrows */}
      <g stroke="#FF4000" strokeWidth="2" fill="none" opacity="0.8">
        <path d="M112 52 L140 115" markerEnd="url(#arrow)" />
        <path d="M140 142 L62 142" markerEnd="url(#arrow)" />
        <path d="M60 118 L88 55" markerEnd="url(#arrow)" />
      </g>

      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#FF4000" />
        </marker>
      </defs>

      {/* Labels */}
      <text x="100" y="44" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">A</text>
      <text x="152" y="134" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">B</text>
      <text x="48" y="134" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">C</text>
    </svg>
  );
}

function PatternCard({ pattern, count }: { pattern: keyof typeof PATTERN_INFO; count?: number }) {
  const info = PATTERN_INFO[pattern];
  const images = {
    ring: "/G-9XLSNWYAA4Y5z.jpeg",
    cluster: "/G-9XMRxWMAAT8qZ.jpeg",
    burst: "/G-e9dg1WkAAYoKy.jpeg",
    stake: "/G-e9dofWAAACB57.jpeg",
    reciprocity: "/G-e9diQWEAAfZ0W.jpeg",
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-6 transition-all duration-300 hover:border-[#FF4000]/30 hover:bg-zinc-900/80">
      {/* Background image */}
      <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity">
        <Image src={images[pattern]} alt="" fill className="object-cover" />
      </div>

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <span className="text-3xl">{info.icon}</span>
          {count !== undefined && (
            <span className="text-2xl font-bold text-[#FF4000]">{count.toLocaleString()}</span>
          )}
        </div>
        <h3 className="text-lg font-semibold text-white mb-2 font-[family-name:var(--font-recoleta)]">{info.title}</h3>
        <p className="text-zinc-400 text-sm leading-relaxed">{info.description}</p>
        <div className="mt-4 pt-4 border-t border-zinc-800/50">
          <code className="text-xs text-[#FF4000]/80 font-mono">{info.visual}</code>
        </div>
      </div>
    </div>
  );
}

function RingVisualization({ members }: { members: { username: string | null; profile_id: number }[] }) {
  const n = members.length;
  const radius = 55;
  const centerX = 80;
  const centerY = 80;

  const points = members.map((_, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  return (
    <div className="relative">
      <svg viewBox="0 0 160 160" className="w-full max-w-[200px]">
        <defs>
          <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF4000" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ff6b35" stopOpacity="0.8" />
          </linearGradient>
          <marker id="arrowSmall" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L8,3 z" fill="#FF4000" />
          </marker>
          <filter id="nodeGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <circle cx={centerX} cy={centerY} r={radius + 15} fill="none" stroke="rgba(255,64,0,0.1)" strokeWidth="1" />

        {points.map((from, i) => {
          const to = points[(i + 1) % n];
          return (
            <line
              key={`edge-${i}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="url(#edgeGradient)"
              strokeWidth="2"
              markerEnd="url(#arrowSmall)"
            />
          );
        })}

        {points.map((point, i) => (
          <g key={`node-${i}`} filter="url(#nodeGlow)">
            <circle cx={point.x} cy={point.y} r="18" fill="#111111" stroke="#FF4000" strokeWidth="2" />
            <text x={point.x} y={point.y + 3} textAnchor="middle" fill="white" fontSize="7" fontWeight="600">
              @{members[i].username?.slice(0, 5) || members[i].profile_id}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function TrustMeter({ score, size = "lg" }: { score: number; size?: "sm" | "lg" }) {
  const percentage = Math.min(100, Math.max(0, score));
  const isLarge = size === "lg";

  const getColor = () => {
    if (score >= 70) return "from-red-500 to-red-600";
    if (score >= 50) return "from-orange-500 to-orange-600";
    if (score >= 30) return "from-yellow-500 to-yellow-600";
    if (score >= 10) return "from-blue-500 to-blue-600";
    return "from-emerald-500 to-emerald-600";
  };

  return (
    <div className={isLarge ? "w-full" : "w-20"}>
      <div className={`${isLarge ? "h-3" : "h-1.5"} bg-zinc-800/50 rounded-full overflow-hidden`}>
        <div
          className={`h-full bg-gradient-to-r ${getColor()} transition-all duration-700 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isLarge && (
        <div className="flex justify-between mt-2 text-xs text-zinc-500 font-medium">
          <span>Trusted</span>
          <span className="text-zinc-400">{score.toFixed(0)}/100</span>
          <span>Suspicious</span>
        </div>
      )}
    </div>
  );
}

// Get account type based on ethos score and behavior
function getAccountType(profile: Profile): { label: string; icon: string; color: string } {
  const ethosScore = profile.ethos_score || 0;
  const givesMore = profile.reciprocity_score < 30; // Low reciprocity = gives more than receives

  if (ethosScore >= 1800) return { label: "Elite", icon: "🏆", color: "text-yellow-400" };
  if (ethosScore >= 1400) return { label: "Established", icon: "⭐", color: "text-blue-400" };
  if (ethosScore >= 1000) return { label: "Growing", icon: "📈", color: "text-emerald-400" };
  if (givesMore) return { label: "Builder", icon: "🔨", color: "text-purple-400" };
  return { label: "New", icon: "🌱", color: "text-zinc-400" };
}

// Get confidence level of our detection
function getConfidenceLevel(profile: Profile): { level: string; description: string; color: string } {
  const signals = [
    profile.ring_score > 20,
    profile.cluster_score > 20,
    profile.burst_score > 20,
    profile.stake_score > 30,
    profile.reciprocity_score > 30,
  ].filter(Boolean).length;

  if (signals >= 3) return { level: "High", description: "Multiple patterns detected", color: "text-red-400" };
  if (signals >= 2) return { level: "Medium", description: "Some patterns detected", color: "text-orange-400" };
  if (signals >= 1) return { level: "Low", description: "Minor pattern detected", color: "text-yellow-400" };
  return { level: "None", description: "No concerning patterns", color: "text-emerald-400" };
}

// Human-readable findings
function getFindings(profile: Profile, ringCount: number): { icon: string; finding: string; severity: "high" | "medium" | "low" }[] {
  const findings: { icon: string; finding: string; severity: "high" | "medium" | "low" }[] = [];

  if (ringCount > 0) {
    findings.push({
      icon: "🔄",
      finding: `Part of ${ringCount} vouch ring${ringCount > 1 ? 's' : ''} — users vouching for each other in circles`,
      severity: "high"
    });
  }

  if (profile.cluster_score > 30) {
    findings.push({
      icon: "🏝️",
      finding: "In an isolated group that mostly vouches within itself",
      severity: "medium"
    });
  }

  if (profile.burst_score > 30) {
    findings.push({
      icon: "📈",
      finding: "Received many vouches in a short time (possible coordination)",
      severity: "medium"
    });
  }

  if (profile.stake_score > 50) {
    findings.push({
      icon: "💸",
      finding: "Most vouches have very small ETH stakes (low commitment)",
      severity: "low"
    });
  }

  if (profile.reciprocity_score > 50) {
    findings.push({
      icon: "📥",
      finding: "Receives far more vouches than they give (possible farming)",
      severity: "medium"
    });
  }

  return findings;
}

// Get recommendation
function getRecommendation(profile: Profile, isOfficial: boolean): { text: string; type: "safe" | "caution" | "warning" } {
  if (isOfficial) {
    return { text: "Official account — high activity is expected", type: "safe" };
  }
  if (profile.composite_score >= 50) {
    return { text: "Exercise caution — multiple red flags detected", type: "warning" };
  }
  if (profile.composite_score >= 30) {
    return { text: "Some concerns — review the findings before vouching", type: "caution" };
  }
  if (profile.composite_score >= 10) {
    return { text: "Minor patterns — likely normal behavior", type: "safe" };
  }
  return { text: "Looks good — no suspicious patterns found", type: "safe" };
}

function ProfileResult({ profile, rings }: { profile: Profile; rings: Ring[] }) {
  const config = RISK_CONFIG[profile.risk_level] || RISK_CONFIG.minimal;
  const profileRings = rings.filter((ring) => ring.some((m) => m.profile_id === profile.profile_id));
  const officialInfo = getOfficialInfo(profile.username);
  const isOfficial = !!officialInfo;

  const accountType = getAccountType(profile);
  const confidence = getConfidenceLevel(profile);
  const findings = getFindings(profile, profileRings.length);
  const recommendation = getRecommendation(profile, isOfficial);

  const recommendationStyles = {
    safe: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    caution: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
    warning: "bg-red-500/10 border-red-500/20 text-red-400",
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header Card */}
      <div className={`relative overflow-hidden rounded-2xl border ${config.border} ${config.bg} p-6 mb-4`}>
        <div className="absolute inset-0 opacity-5">
          <Image src="/G-e9dofWAAACB57.jpeg" alt="" fill className="object-cover" />
        </div>

        <div className="relative z-10">
          {/* Profile Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-1">
                {profile.display_name || `@${profile.username}` || `Profile #${profile.profile_id}`}
              </h2>
              {profile.username && <p className="text-zinc-400 text-sm">@{profile.username}</p>}

              {/* Account Tags */}
              <div className="flex items-center gap-2 mt-3">
                {isOfficial ? (
                  <span className="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[#FF4000] to-[#ff6b35] rounded-lg text-white">
                    {officialInfo.type}
                  </span>
                ) : (
                  <span className={`px-2 py-1 text-xs font-medium rounded-lg bg-zinc-800 ${accountType.color}`}>
                    {accountType.icon} {accountType.label}
                  </span>
                )}
                {profile.ethos_score && (
                  <span className="px-2 py-1 text-xs font-medium rounded-lg bg-zinc-800 text-zinc-300">
                    Score: {profile.ethos_score}
                  </span>
                )}
              </div>
            </div>

            {/* Traffic Light */}
            <div className="text-center">
              <div className={`w-16 h-16 rounded-2xl ${config.bg} border ${config.border} flex items-center justify-center text-3xl mb-2`}>
                {config.icon}
              </div>
              <p className={`text-xs font-bold ${config.color}`}>{config.label}</p>
            </div>
          </div>

          {/* The Bottom Line - Most Important */}
          <div className={`rounded-xl p-4 border ${recommendationStyles[recommendation.type]} mb-6`}>
            <p className="font-semibold text-lg">{recommendation.text}</p>
          </div>

          {/* Detection Confidence */}
          {findings.length > 0 && (
            <div className="flex items-center gap-2 mb-4 text-sm">
              <span className="text-zinc-500">Detection confidence:</span>
              <span className={`font-semibold ${confidence.color}`}>{confidence.level}</span>
              <span className="text-zinc-600">({confidence.description})</span>
            </div>
          )}
        </div>
      </div>

      {/* What We Found - Human Readable */}
      {findings.length > 0 && (
        <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-6 mb-4">
          <h3 className="text-white font-semibold mb-4">What we found</h3>
          <div className="space-y-3">
            {findings.map((f, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${
                f.severity === 'high' ? 'bg-red-500/10 border border-red-500/20' :
                f.severity === 'medium' ? 'bg-orange-500/10 border border-orange-500/20' :
                'bg-yellow-500/10 border border-yellow-500/20'
              }`}>
                <span className="text-xl">{f.icon}</span>
                <p className="text-zinc-200 text-sm">{f.finding}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ring Visualization */}
      {profileRings.length > 0 && !isOfficial && (
        <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-red-500/5 p-6 mb-4">
          <div className="absolute inset-0 opacity-10">
            <Image src="/G-9XLSNWYAA4Y5z.jpeg" alt="" fill className="object-cover" />
          </div>
          <div className="relative z-10">
            <h3 className="text-white font-semibold mb-2">Visual: The Vouch Ring</h3>
            <p className="text-zinc-400 text-sm mb-4">
              These {profileRings[0].length} users vouch for each other in a circle.
              Each arrow shows a vouch — notice how it loops back to the start.
            </p>
            <div className="bg-zinc-900/80 rounded-xl p-6 flex items-center justify-center">
              <RingVisualization members={profileRings[0]} />
            </div>
          </div>
        </div>
      )}

      {/* Clean Profile */}
      {findings.length === 0 && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center mb-4">
          <span className="text-4xl mb-3 block">✓</span>
          <p className="text-emerald-400 font-semibold text-lg">Clean profile</p>
          <p className="text-zinc-400 text-sm mt-2">
            We analyzed this profile&apos;s vouch patterns and found nothing suspicious.
            Their reputation appears to be built organically.
          </p>
        </div>
      )}

      {/* What This Means */}
      <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-6 mb-4">
        <h3 className="text-white font-semibold mb-3">What does this mean?</h3>
        {profile.composite_score >= 30 ? (
          <div className="space-y-2 text-sm text-zinc-400">
            <p>• <span className="text-white">This doesn&apos;t prove wrongdoing</span> — patterns can have innocent explanations</p>
            <p>• <span className="text-white">Friends vouch for friends</span> — some clustering is natural</p>
            <p>• <span className="text-white">Our algorithm isn&apos;t perfect</span> — use this as one data point, not the final verdict</p>
            <p>• <span className="text-white">Do your own research</span> — check their Ethos profile and activity history</p>
          </div>
        ) : (
          <div className="space-y-2 text-sm text-zinc-400">
            <p>• <span className="text-white">No red flags detected</span> — this profile&apos;s vouch network looks healthy</p>
            <p>• <span className="text-white">Vouches appear organic</span> — no circular patterns or suspicious timing</p>
            <p>• <span className="text-white">Still do your research</span> — our tool checks patterns, not character</p>
          </div>
        )}
      </div>

      {/* Action */}
      <a
        href={`https://app.ethos.network/profile/x/${profile.username}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center py-4 rounded-xl bg-[#FF4000] hover:bg-[#e63900] text-white font-semibold transition-all hover:shadow-lg hover:shadow-[#FF4000]/20"
      >
        View Full Profile on Ethos →
      </a>
    </div>
  );
}

function ProfileListItem({ profile, onClick }: { profile: Profile; onClick: () => void }) {
  const config = RISK_CONFIG[profile.risk_level];
  const isOfficial = isOfficialAccount(profile.username);
  const accountType = getAccountType(profile);

  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/50 hover:border-[#FF4000]/30 rounded-xl p-4 transition-all duration-200 text-left w-full group"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full ${config?.bg} border ${config?.border} flex items-center justify-center text-lg group-hover:scale-110 transition-transform`}>
          {config?.icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-white font-medium text-sm group-hover:text-[#FF4000] transition-colors">
              @{profile.username || profile.profile_id}
            </p>
            {isOfficial ? (
              <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase bg-[#FF4000]/20 text-[#FF4000] rounded">
                Official
              </span>
            ) : (
              <span className={`text-[10px] ${accountType.color}`}>{accountType.icon}</span>
            )}
          </div>
          <p className="text-zinc-500 text-xs truncate max-w-[120px]">{profile.display_name}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <TrustMeter score={profile.composite_score} size="sm" />
        <span className={`font-bold text-sm ${config?.color} min-w-[2rem] text-right`}>
          {profile.composite_score.toFixed(0)}
        </span>
      </div>
    </button>
  );
}

// Fuzzy search function
function fuzzyMatch(query: string, target: string): boolean {
  if (!target) return false;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return true;
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export default function Home() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rings, setRings] = useState<Ring[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<Profile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"search" | "learn" | "dashboard">("search");
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [profilesRes, ringsRes, summaryRes] = await Promise.all([
          fetch("/data/profiles_full.json"),
          fetch("/data/rings_named.json"),
          fetch("/data/summary_20260122_193106.json"),
        ]);
        setProfiles(await profilesRes.json());
        setRings(await ringsRes.json());
        setSummary(await summaryRes.json());
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSearch = () => {
    const query = searchQuery.trim().toLowerCase().replace("@", "");
    if (!query) return;
    const profile = profiles.find(
      (p) => p.username?.toLowerCase() === query || p.profile_id.toString() === query
    );
    if (profile) {
      setSearchResult(profile);
      setNotFound(false);
    } else {
      setSearchResult(null);
      setNotFound(true);
    }
  };

  const handleBack = () => {
    setSearchResult(null);
    setNotFound(false);
    setSearchQuery("");
  };

  const highRiskProfiles = useMemo(() =>
    profiles.filter((p) => p.composite_score >= 30 && !isOfficialAccount(p.username)).slice(0, 10),
    [profiles]
  );

  const healthyProfiles = useMemo(() =>
    profiles
      .filter((p) => p.composite_score < 10 && p.username && p.ethos_score)
      .sort((a, b) => (b.ethos_score || 0) - (a.ethos_score || 0))
      .slice(0, 10),
    [profiles]
  );

  const suggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    return profiles
      .filter(p => p.username && fuzzyMatch(searchQuery, p.username))
      .slice(0, 6);
  }, [searchQuery, profiles]);

  const selectSuggestion = (profile: Profile) => {
    setSearchQuery(profile.username || "");
    setShowSuggestions(false);
    setSearchResult(profile);
    setNotFound(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <Image src="/G-9XLSNWYAA4Y5z.jpeg" alt="" fill className="object-cover" />
        </div>
        <div className="text-center relative z-10">
          <div className="w-32 h-32 mx-auto mb-6">
            <AnimatedRing />
          </div>
          <p className="text-zinc-400 font-medium">Analyzing trust network...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Global noise/dither overlay */}
      <div className="fixed inset-0 z-[100] pointer-events-none opacity-[0.04]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
      }} />

      {/* Animated gradient background - only on landing page */}
      {view === "search" && !searchResult && !notFound && (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Animated orange gradient blobs */}
          <div className="absolute w-[800px] h-[800px] -top-[200px] -left-[200px] rounded-full bg-[#FF4000]/10 blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
          <div className="absolute w-[600px] h-[600px] top-[30%] right-[-100px] rounded-full bg-[#FF4000]/8 blur-[100px] animate-[pulse_10s_ease-in-out_infinite_2s]" />
          <div className="absolute w-[500px] h-[500px] bottom-[-100px] left-[20%] rounded-full bg-[#ff6b35]/6 blur-[80px] animate-[pulse_12s_ease-in-out_infinite_4s]" />
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-transparent backdrop-blur-sm border-b border-zinc-800/20">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button onClick={handleBack} className="flex items-center gap-3 group">
              <Image
                src="/ringer.png"
                alt="Trust Ring Detector"
                width={40}
                height={40}
                className="rounded-xl shadow-lg shadow-[#FF4000]/20 group-hover:scale-105 transition-transform"
              />
              <div>
                <h1 className="text-lg font-[family-name:var(--font-recoleta)] group-hover:text-[#FF4000] transition-colors">
                  Trust Ring Detector
                </h1>
                <p className="text-zinc-500 text-xs">Ethos Network Analysis</p>
              </div>
            </button>

            <nav className="flex gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50">
              {[
                { id: "search", label: "Check Profile" },
                { id: "learn", label: "What is Collusion?" },
                { id: "dashboard", label: "Network Health" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setView(tab.id as typeof view); handleBack(); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    view === tab.id
                      ? "bg-[#FF4000] text-white shadow-lg shadow-[#FF4000]/20"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 relative z-10">
        {view === "search" && (
          <>
            {!searchResult && !notFound && (
              <div className="text-center mb-12 animate-[fadeIn_0.5s_ease-out]">
                <h2 className="text-4xl md:text-5xl mb-4 font-[family-name:var(--font-recoleta)]">
                  Should I <span className="text-[#FF4000]">vouch</span> for this person?
                </h2>
                <p className="text-zinc-400 text-lg max-w-xl mx-auto">
                  Detect collusion patterns before staking your ETH on someone&apos;s reputation
                </p>
              </div>
            )}

            <div className="max-w-2xl mx-auto mb-10 relative">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Enter X handle (e.g. serpinxbt, VitalikButerin)"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSearch();
                        setShowSuggestions(false);
                      }
                    }}
                    className="w-full bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-5 py-4 text-white placeholder-zinc-500 focus:border-[#FF4000]/50 focus:outline-none text-lg transition-all"
                  />
                  {/* Autocomplete dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden z-50 shadow-2xl">
                      {suggestions.map((s) => (
                        <button
                          key={s.profile_id}
                          onClick={() => selectSuggestion(s)}
                          className="w-full px-5 py-3 text-left hover:bg-zinc-800 flex items-center justify-between border-b border-zinc-800 last:border-0 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-white font-medium">@{s.username}</span>
                            {s.display_name && (
                              <span className="text-zinc-500 text-sm">{s.display_name}</span>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            s.composite_score >= 30 ? 'bg-red-500/20 text-red-400' :
                            s.composite_score >= 10 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {s.composite_score.toFixed(0)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    handleSearch();
                    setShowSuggestions(false);
                  }}
                  className="px-8 py-4 rounded-xl bg-[#FF4000] hover:bg-[#e63900] text-white font-semibold transition-all hover:shadow-lg hover:shadow-[#FF4000]/20"
                >
                  Check →
                </button>
              </div>
              {/* Click outside to close */}
              {showSuggestions && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSuggestions(false)}
                />
              )}
            </div>

            {searchResult && (
              <div>
                <button onClick={handleBack} className="flex items-center gap-2 text-zinc-400 hover:text-[#FF4000] mb-6 transition-colors group">
                  <span className="group-hover:-translate-x-1 transition-transform">←</span>
                  <span>Back to search</span>
                </button>
                <ProfileResult profile={searchResult} rings={rings} />
              </div>
            )}

            {notFound && (
              <div className="text-center py-16 animate-[fadeIn_0.3s_ease-out]">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-zinc-800/50 flex items-center justify-center">
                  <span className="text-4xl">🔍</span>
                </div>
                <p className="text-zinc-300 text-xl font-medium mb-2">Profile not found</p>
                <p className="text-zinc-500">We couldn&apos;t find &quot;{searchQuery}&quot; in the Ethos network</p>
                <button onClick={handleBack} className="mt-6 text-[#FF4000] hover:text-[#ff6b35] font-medium">
                  ← Try another search
                </button>
              </div>
            )}

            {!searchResult && !notFound && (
              <div className="grid md:grid-cols-2 gap-8 mt-8">
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/20 flex items-center justify-center">
                      <span className="text-sm">⚠️</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Suspicious Profiles</h3>
                      <p className="text-zinc-500 text-xs">Potential collusion detected</p>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                    {highRiskProfiles.map((p) => (
                      <ProfileListItem
                        key={p.profile_id}
                        profile={p}
                        onClick={() => {
                          setSearchResult(p);
                          setSearchQuery(p.username || p.profile_id.toString());
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center">
                      <span className="text-sm">✓</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Trusted Profiles</h3>
                      <p className="text-zinc-500 text-xs">Clean vouch patterns</p>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                    {healthyProfiles.map((p) => (
                      <ProfileListItem
                        key={p.profile_id}
                        profile={p}
                        onClick={() => {
                          setSearchResult(p);
                          setSearchQuery(p.username || p.profile_id.toString());
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {view === "learn" && (
          <div className="animate-[fadeIn_0.5s_ease-out]">
            {/* Hero */}
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl mb-4 font-[family-name:var(--font-recoleta)]">
                What is <span className="text-[#FF4000]">Collusion?</span>
              </h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                In reputation systems, bad actors coordinate to artificially inflate their credibility.
                We detect these patterns to protect the integrity of the Ethos network.
              </p>
            </div>

            {/* Animated Ring Demo */}
            <div className="relative overflow-hidden rounded-3xl border border-zinc-800/50 bg-zinc-900/30 p-8 mb-12">
              <div className="absolute inset-0 opacity-10">
                <Image src="/G-9XLSNWYAA4Y5z.jpeg" alt="" fill className="object-cover" />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="w-48 h-48 flex-shrink-0">
                  <AnimatedRing />
                </div>
                <div>
                  <h3 className="text-2xl font-[family-name:var(--font-recoleta)] text-white mb-3">
                    The Classic Vouch Ring
                  </h3>
                  <p className="text-zinc-400 leading-relaxed mb-4">
                    Three or more users vouch for each other in a circle. A vouches for B, B vouches for C,
                    and C vouches back to A. This creates artificial credibility without any real trust signal.
                  </p>
                  <p className="text-zinc-500 text-sm">
                    Our algorithm detected <span className="text-[#FF4000] font-bold">{summary?.ring_stats.total_rings.toLocaleString()}</span> such
                    rings involving <span className="text-[#FF4000] font-bold">{summary?.ring_stats.profiles_in_rings.toLocaleString()}</span> profiles.
                  </p>
                </div>
              </div>
            </div>

            {/* Pattern Grid */}
            <h3 className="text-xl font-semibold text-white mb-6">Five Detection Signals</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
              <PatternCard pattern="ring" count={summary?.ring_stats.total_rings} />
              <PatternCard pattern="cluster" />
              <PatternCard pattern="burst" />
              <PatternCard pattern="stake" />
              <PatternCard pattern="reciprocity" />
            </div>

            {/* How We Score */}
            <div className="relative overflow-hidden rounded-3xl border border-zinc-800/50 bg-zinc-900/30 p-8">
              <div className="absolute inset-0 opacity-5">
                <Image src="/G-e9dofWAAACB57.jpeg" alt="" fill className="object-cover" />
              </div>
              <div className="relative z-10">
                <h3 className="text-2xl font-[family-name:var(--font-recoleta)] text-white mb-4">
                  Composite Risk Score
                </h3>
                <p className="text-zinc-400 mb-6">
                  We combine all five signals into a single 0-100 risk score using weighted analysis:
                </p>
                <div className="bg-zinc-900/80 rounded-xl p-6 font-mono text-sm">
                  <code className="text-zinc-300">
                    <span className="text-[#FF4000]">risk</span> = (
                    <span className="text-orange-400">0.30</span> × ring) + (
                    <span className="text-orange-400">0.25</span> × cluster) + (
                    <span className="text-orange-400">0.20</span> × burst) + (
                    <span className="text-orange-400">0.15</span> × stake) + (
                    <span className="text-orange-400">0.10</span> × reciprocity)
                  </code>
                </div>
                <div className="mt-6 grid grid-cols-5 gap-4 text-center text-xs">
                  {["Ring 30%", "Cluster 25%", "Burst 20%", "Stake 15%", "Reciprocity 10%"].map((label) => (
                    <div key={label} className="text-zinc-500">{label}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === "dashboard" && (
          <div className="animate-[fadeIn_0.5s_ease-out]">
            <div className="mb-8">
              <h2 className="text-3xl font-[family-name:var(--font-recoleta)]">Network Health</h2>
              <p className="text-zinc-400 mt-2">Real-time analysis of {summary?.graph_stats.nodes.toLocaleString()} profiles</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Vouches", value: summary?.vouch_stats.total_vouches || 0, icon: "🤝" },
                { label: "Profiles Analyzed", value: summary?.graph_stats.nodes || 0, icon: "👥" },
                { label: "Rings Detected", value: summary?.ring_stats.total_rings || 0, icon: "🔄", highlight: true },
                { label: "High Risk", value: summary?.high_risk_count || 0, icon: "⚠️", highlight: true },
              ].map((stat) => (
                <div key={stat.label} className={`relative overflow-hidden rounded-2xl border p-5 ${stat.highlight ? 'border-[#FF4000]/20 bg-[#FF4000]/5' : 'border-zinc-800/50 bg-zinc-900/50'}`}>
                  <span className="text-2xl mb-2 block">{stat.icon}</span>
                  <p className="text-zinc-400 text-sm">{stat.label}</p>
                  <p className={`text-3xl font-bold mt-1 ${stat.highlight ? 'text-[#FF4000]' : 'text-white'}`}>
                    {stat.value.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            {/* Risk Distribution */}
            <div className="relative overflow-hidden rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-6 mb-8">
              <h3 className="font-semibold text-lg mb-6">Risk Distribution</h3>
              <div className="grid grid-cols-5 gap-4">
                {(["critical", "high", "medium", "low", "minimal"] as const).map((level) => {
                  const config = RISK_CONFIG[level];
                  const count = summary?.network_summary.risk_distribution[level] || 0;
                  const pct = ((count / (summary?.graph_stats.nodes || 1)) * 100).toFixed(1);
                  return (
                    <div key={level} className="text-center">
                      <div className={`w-12 h-12 mx-auto rounded-xl ${config.bg} border ${config.border} flex items-center justify-center text-xl mb-3`}>
                        {config.icon}
                      </div>
                      <p className="text-xl font-bold text-white">{count.toLocaleString()}</p>
                      <p className={`text-xs font-medium ${config.color} uppercase mt-1`}>{level}</p>
                      <p className="text-zinc-500 text-xs">{pct}%</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ring Stats */}
            <div className="relative overflow-hidden rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-6">
              <div className="absolute inset-0 opacity-5">
                <Image src="/G-9XLSNWYAA4Y5z.jpeg" alt="" fill className="object-cover" />
              </div>
              <div className="relative z-10">
                <h3 className="font-semibold text-lg mb-6">Ring Analysis</h3>
                <div className="grid grid-cols-3 gap-6 mb-6">
                  {[
                    { size: "3", label: "Triangles", color: "text-[#FF4000]" },
                    { size: "4", label: "Squares", color: "text-orange-400" },
                    { size: "5", label: "Pentagons", color: "text-yellow-400" },
                  ].map(({ size, label, color }) => (
                    <div key={size} className="text-center p-4 bg-zinc-900/50 rounded-xl">
                      <p className={`text-4xl font-bold ${color}`}>{summary?.ring_stats.rings_by_size[size] || 0}</p>
                      <p className="text-zinc-400 mt-2 text-sm">{label}</p>
                      <p className="text-zinc-600 text-xs">{size}-node rings</p>
                    </div>
                  ))}
                </div>
                <div className="pt-6 border-t border-zinc-800/50 flex justify-between items-center">
                  <div>
                    <p className="text-zinc-400 text-sm">Profiles in rings</p>
                    <p className="text-white font-bold text-xl">{summary?.ring_stats.profiles_in_rings.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-zinc-400 text-sm">Network coverage</p>
                    <p className="text-[#FF4000] font-bold text-xl">
                      {((summary?.ring_stats.profiles_in_rings || 0) / (summary?.graph_stats.nodes || 1) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 text-center text-zinc-500 text-sm">
              <p>Average Risk Score: <span className="text-white font-medium">{summary?.network_summary.avg_risk_score.toFixed(1)}/100</span></p>
              <p className="mt-2">Built for <span className="text-[#FF4000]">Ethos Vibeathon</span></p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
