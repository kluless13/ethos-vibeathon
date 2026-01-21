"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import sdk from "@farcaster/miniapp-sdk";
import Image from "next/image";

interface EthosProfile {
  id: number;
  username?: string;
  score: number;
  scoreLevel: string;
  vouchesReceived: number;
  ethStaked: number;
}

interface LocalProfile {
  profile_id: number;
  username: string | null;
  display_name: string | null;
}

const levelColors: Record<string, { color: string; bg: string; label: string }> = {
  exemplary: { color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)", label: "EXEMPLARY" },
  reputable: { color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", label: "REPUTABLE" },
  neutral: { color: "#737373", bg: "rgba(115, 115, 115, 0.1)", label: "NEUTRAL" },
  questionable: { color: "#f97316", bg: "rgba(249, 115, 22, 0.1)", label: "QUESTIONABLE" },
  untrusted: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", label: "UNTRUSTED" },
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

      <g className="animate-[spin_20s_linear_infinite]" style={{ transformOrigin: '100px 100px' }}>
        <circle cx="100" cy="100" r="80" fill="none" stroke="url(#ringGrad)" strokeWidth="1" strokeDasharray="10 5" opacity="0.3" />
      </g>

      <g className="animate-[spin_15s_linear_infinite_reverse]" style={{ transformOrigin: '100px 100px' }}>
        <circle cx="100" cy="100" r="60" fill="none" stroke="url(#ringGrad)" strokeWidth="1.5" strokeDasharray="8 4" opacity="0.5" />
      </g>

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

      <text x="100" y="44" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">A</text>
      <text x="152" y="134" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">B</text>
      <text x="48" y="134" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">C</text>
    </svg>
  );
}

// Fuzzy search function
function fuzzyMatch(query: string, target: string): boolean {
  if (!target) return false;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return true;

  // Simple fuzzy: check if all chars appear in order
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export default function MiniApp() {
  const [isReady, setIsReady] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<EthosProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localProfiles, setLocalProfiles] = useState<LocalProfile[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Load local profiles for autocomplete
        const res = await fetch("/data/profiles_full.json");
        const data = await res.json();
        setLocalProfiles(data);
      } catch (err) {
        console.error("Failed to load profiles:", err);
      }

      try {
        await sdk.actions.ready();
      } catch (err) {
        console.error("Failed to initialize SDK:", err);
      }
      setIsReady(true);
    };
    init();
  }, []);

  // Fuzzy search suggestions
  const suggestions = useMemo(() => {
    if (!username.trim() || username.length < 2) return [];
    return localProfiles
      .filter(p => p.username && fuzzyMatch(username, p.username))
      .slice(0, 5);
  }, [username, localProfiles]);

  const searchProfile = useCallback(async (searchUsername?: string) => {
    const query = (searchUsername || username).trim().toLowerCase().replace("@", "");
    if (!query) return;

    setLoading(true);
    setError(null);
    setProfile(null);
    setShowSuggestions(false);

    try {
      const res = await fetch(`/api/ethos/lookup?username=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Profile not found");
        return;
      }

      setProfile(data.profile);
    } catch {
      setError("Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  }, [username]);

  const selectSuggestion = useCallback((suggestion: LocalProfile) => {
    setUsername(suggestion.username || "");
    setShowSuggestions(false);
    searchProfile(suggestion.username || "");
  }, [searchProfile]);

  const openEthosProfile = useCallback(() => {
    if (profile?.username) {
      sdk.actions.openUrl(`https://app.ethos.network/profile/x/${profile.username}`);
    }
  }, [profile]);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6">
        <div className="w-40 h-40 mb-6">
          <AnimatedRing />
        </div>
        <p className="text-zinc-400 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Image
          src="/ringer.png"
          alt="Ethos Trust Check"
          width={44}
          height={44}
          className="rounded-xl"
        />
        <div>
          <div className="text-lg font-bold">Ethos Trust Check</div>
          <div className="text-zinc-500 text-sm">Check reputation before vouching</div>
        </div>
      </div>

      {/* Search with Autocomplete */}
      <div className="relative mb-5">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Enter X handle (e.g. serpin, VitalikButerin)"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  searchProfile();
                  setShowSuggestions(false);
                }
              }}
              className="w-full px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900 text-white placeholder-zinc-500 focus:border-[#FF4000]/50 focus:outline-none"
            />

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden z-50 shadow-xl">
                {suggestions.map((s) => (
                  <button
                    key={s.profile_id}
                    onClick={() => selectSuggestion(s)}
                    className="w-full px-4 py-3 text-left hover:bg-zinc-800 flex items-center justify-between border-b border-zinc-800 last:border-0"
                  >
                    <span className="text-white">@{s.username}</span>
                    {s.display_name && (
                      <span className="text-zinc-500 text-sm truncate ml-2">{s.display_name}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => searchProfile()}
            disabled={loading || !username.trim()}
            className="px-6 py-3 rounded-xl bg-[#FF4000] text-white font-semibold disabled:opacity-50"
          >
            {loading ? "..." : "Check"}
          </button>
        </div>
      </div>

      {/* Click outside to close suggestions */}
      {showSuggestions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSuggestions(false)}
        />
      )}

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center py-10">
          <div className="w-32 h-32 mb-4">
            <AnimatedRing />
          </div>
          <p className="text-zinc-400 text-sm">Looking up @{username}...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 mb-5">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Result */}
      {profile && !loading && (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 flex-1">
          <div className="flex items-start justify-between mb-5">
            <div className="text-xl font-bold">@{profile.username}</div>
            <div
              className="px-3 py-1 rounded-lg text-xs font-bold border"
              style={{
                backgroundColor: levelColors[profile.scoreLevel]?.bg,
                borderColor: levelColors[profile.scoreLevel]?.color,
                color: levelColors[profile.scoreLevel]?.color,
              }}
            >
              {levelColors[profile.scoreLevel]?.label || "UNKNOWN"}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
              <div className="text-zinc-500 text-xs mb-1">Ethos Score</div>
              <div
                className="text-2xl font-bold"
                style={{ color: levelColors[profile.scoreLevel]?.color }}
              >
                {profile.score}
              </div>
              <div className="text-zinc-600 text-xs">out of 2800</div>
            </div>

            <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
              <div className="text-zinc-500 text-xs mb-1">Vouches</div>
              <div className="text-2xl font-bold text-blue-500">
                {profile.vouchesReceived}
              </div>
              <div className="text-zinc-600 text-xs">received</div>
            </div>

            <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
              <div className="text-zinc-500 text-xs mb-1">ETH Staked</div>
              <div className="text-2xl font-bold text-emerald-500">
                {profile.ethStaked.toFixed(2)}
              </div>
              <div className="text-zinc-600 text-xs">committed</div>
            </div>
          </div>

          <button
            onClick={openEthosProfile}
            className="w-full py-4 rounded-xl border border-[#FF4000] text-[#FF4000] font-semibold hover:bg-[#FF4000]/10 transition-colors"
          >
            View Full Profile on Ethos →
          </button>
        </div>
      )}

      {/* Empty state */}
      {!profile && !loading && !error && (
        <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
          <div className="w-24 h-24 mb-4 opacity-30">
            <AnimatedRing />
          </div>
          <p className="text-zinc-500 text-sm">
            Enter a username to check their Ethos reputation
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-5 text-center text-zinc-600 text-xs">
        Built for Ethos Vibeathon • Powered by ethos-ts-sdk
      </div>
    </div>
  );
}
