"use client";

import { useEffect, useState, useCallback } from "react";
import sdk from "@farcaster/miniapp-sdk";

interface EthosProfile {
  id: number;
  username?: string;
  score: number;
  scoreLevel: string;
  vouchesReceived: number;
  ethStaked: number;
}

const levelColors: Record<string, { color: string; bg: string; label: string }> = {
  exemplary: { color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)", label: "EXEMPLARY" },
  reputable: { color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", label: "REPUTABLE" },
  neutral: { color: "#737373", bg: "rgba(115, 115, 115, 0.1)", label: "NEUTRAL" },
  questionable: { color: "#f97316", bg: "rgba(249, 115, 22, 0.1)", label: "QUESTIONABLE" },
  untrusted: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", label: "UNTRUSTED" },
};

export default function MiniApp() {
  const [isReady, setIsReady] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<EthosProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await sdk.actions.ready();
        setIsReady(true);
      } catch (err) {
        console.error("Failed to initialize SDK:", err);
        setIsReady(true); // Still show UI even if SDK fails
      }
    };
    init();
  }, []);

  const searchProfile = useCallback(async () => {
    if (!username.trim()) return;

    setLoading(true);
    setError(null);
    setProfile(null);

    try {
      const res = await fetch(`/api/ethos/lookup?username=${encodeURIComponent(username.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Profile not found");
        return;
      }

      setProfile(data.profile);
    } catch (err) {
      setError("Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  }, [username]);

  const openEthosProfile = useCallback(() => {
    if (profile?.username) {
      sdk.actions.openUrl(`https://app.ethos.network/profile/x/${profile.username}`);
    }
  }, [profile]);

  if (!isReady) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>E</div>
        <div>
          <div style={styles.title}>Ethos Trust Check</div>
          <div style={styles.subtitle}>Check reputation before vouching</div>
        </div>
      </div>

      {/* Search */}
      <div style={styles.searchBox}>
        <input
          type="text"
          placeholder="Enter X/Twitter handle..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchProfile()}
          style={styles.input}
        />
        <button
          onClick={searchProfile}
          disabled={loading || !username.trim()}
          style={{
            ...styles.button,
            opacity: loading || !username.trim() ? 0.5 : 1,
          }}
        >
          {loading ? "..." : "Check"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={styles.errorBox}>
          <span style={styles.errorText}>{error}</span>
        </div>
      )}

      {/* Result */}
      {profile && (
        <div style={styles.resultCard}>
          <div style={styles.resultHeader}>
            <div style={styles.resultUsername}>@{profile.username}</div>
            <div style={{
              ...styles.badge,
              backgroundColor: levelColors[profile.scoreLevel]?.bg || levelColors.neutral.bg,
              borderColor: levelColors[profile.scoreLevel]?.color || levelColors.neutral.color,
              color: levelColors[profile.scoreLevel]?.color || levelColors.neutral.color,
            }}>
              {levelColors[profile.scoreLevel]?.label || "UNKNOWN"}
            </div>
          </div>

          <div style={styles.statsGrid}>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>Ethos Score</div>
              <div style={{
                ...styles.statValue,
                color: levelColors[profile.scoreLevel]?.color || "#fff",
              }}>
                {profile.score}
              </div>
              <div style={styles.statSub}>out of 2800</div>
            </div>

            <div style={styles.statBox}>
              <div style={styles.statLabel}>Vouches</div>
              <div style={{ ...styles.statValue, color: "#3b82f6" }}>
                {profile.vouchesReceived}
              </div>
              <div style={styles.statSub}>received</div>
            </div>

            <div style={styles.statBox}>
              <div style={styles.statLabel}>ETH Staked</div>
              <div style={{ ...styles.statValue, color: "#22c55e" }}>
                {profile.ethStaked.toFixed(2)}
              </div>
              <div style={styles.statSub}>committed</div>
            </div>
          </div>

          <button onClick={openEthosProfile} style={styles.viewButton}>
            View Full Profile on Ethos
          </button>
        </div>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        Built for Ethos Vibeathon
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#0a0a0a",
    color: "#fff",
    padding: 20,
    fontFamily: "system-ui, -apple-system, sans-serif",
    display: "flex",
    flexDirection: "column",
  },
  loading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    color: "#737373",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#FF4000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    fontWeight: 700,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
  },
  subtitle: {
    fontSize: 14,
    color: "#737373",
  },
  searchBox: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid #262626",
    backgroundColor: "#111",
    color: "#fff",
    fontSize: 16,
    outline: "none",
  },
  button: {
    padding: "12px 24px",
    borderRadius: 12,
    border: "none",
    backgroundColor: "#FF4000",
    color: "#fff",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
  },
  errorBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    marginBottom: 20,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
  },
  resultCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#111",
    border: "1px solid #262626",
    marginBottom: 20,
  },
  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  resultUsername: {
    fontSize: 24,
    fontWeight: 700,
  },
  badge: {
    padding: "6px 12px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#0a0a0a",
    textAlign: "center" as const,
  },
  statLabel: {
    fontSize: 12,
    color: "#737373",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 700,
  },
  statSub: {
    fontSize: 10,
    color: "#525252",
  },
  viewButton: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    border: "1px solid #FF4000",
    backgroundColor: "transparent",
    color: "#FF4000",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  footer: {
    marginTop: "auto",
    textAlign: "center" as const,
    color: "#525252",
    fontSize: 12,
    paddingTop: 20,
  },
};
