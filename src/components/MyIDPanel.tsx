import { useEffect, useState } from "react";

type MyIDPanelProps = {
  fid: number | null;
  displayName: string | null;
  pfp: string | null;
  wallet: string | null;
};

type IdentityStats = {
  neynarScore?: number;
  activeDays?: number;
  walletAgeDays?: number;
  totalTx?: number;
  bestStreak?: number;
};

function normalizeIdentityScore({
  neynarScore = 0,
  activeDays = 0,
  bestStreak = 0,
  totalTx = 0
}: {
  neynarScore?: number;
  activeDays?: number;
  bestStreak?: number;
  totalTx?: number;
}) {
  const clamp = (v: number, min = 0, max = 1) =>
    Math.max(min, Math.min(max, v));

  const neynarNorm = clamp(neynarScore);
  const activeDaysNorm = clamp(activeDays / 90);
  const streakNorm = clamp(bestStreak / 30);
  const txNorm = clamp(Math.log10(totalTx + 1) / 4);

  const baseScore =
    activeDaysNorm * 0.4 +
    streakNorm * 0.4 +
    txNorm * 0.2;

  const finalScore =
    neynarNorm * 0.5 +
    baseScore * 0.5;

  return Math.round(finalScore * 100);
}

function getTier(score: number) {
  if (score >= 70) return { label: "Gold", icon: "🥇", color: "#d4a017" };
  if (score >= 40) return { label: "Silver", icon: "🥈", color: "#8a8a8a" };
  return { label: "Bronze", icon: "🥉", color: "#b87333" };
}

export default function MyIDPanel({
  fid,
  displayName,
  pfp,
  wallet
}: MyIDPanelProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<IdentityStats | null>(null);

  const identityScore =
    !loading && stats
      ? normalizeIdentityScore({
          neynarScore: stats.neynarScore,
          activeDays: stats.activeDays,
          bestStreak: stats.bestStreak,
          totalTx: stats.totalTx
        })
      : null;

  const tier = identityScore !== null ? getTier(identityScore) : null;

  useEffect(() => {
    if (!wallet || !fid) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadIdentity() {
      try {
        const res = await fetch(`/api/identity?wallet=${wallet}&fid=${fid}`);
        const data = await res.json();
        if (!mounted) return;

        setStats({
          neynarScore: data.neynarScore,
          activeDays: data.activeDays,
          walletAgeDays: data.walletAgeDays,
          totalTx: data.totalTx,
          bestStreak: data.bestStreak
        });
      } catch {
        if (mounted) setStats(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadIdentity();
    return () => {
      mounted = false;
    };
  }, [wallet, fid]);

  return (
    <div style={{ padding: 18, maxWidth: 480, margin: "0 auto" }}>
      {/* HEADER CARD */}
      <div
        style={{
          position: "relative",
          background: "linear-gradient(180deg,#fff6f0,#ffe6ca)",
          borderRadius: 16,
          padding: 18,
          textAlign: "center",
          boxShadow: "0 6px 18px rgba(0,0,0,0.06)"
        }}
      >
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.65)",
              borderRadius: 16,
              zIndex: 2
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "3px solid rgba(0,0,0,0.15)",
                borderTopColor: "#ff9548",
                animation: "km-spin 0.9s linear infinite"
              }}
            />
          </div>
        )}

        <img
          src={pfp || "/icon.png"}
          alt="pfp"
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            objectFit: "cover",
            marginBottom: 8
          }}
        />

        <div style={{ fontWeight: 800, fontSize: 18 }}>
          {displayName || "Anonymous"}
        </div>

        {!loading && tier && (
          <div
            style={{
              marginTop: 4,
              fontSize: 13,
              fontWeight: 800,
              color: tier.color,
              letterSpacing: "0.2px"
            }}
          >
            {tier.icon} {tier.label} Identity
          </div>
        )}

        {fid && (
          <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>
            FID {fid}
          </div>
        )}

        {!loading && stats?.neynarScore !== undefined && (
          <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700 }}>
            Neynar Score{" "}
            <span style={{ color: "#ff7f2e" }}>
              {stats.neynarScore.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* CONTENT */}
      {!loading && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginTop: 14
            }}
          >
            <StatBox label="Active Days" value={stats?.activeDays} />
            <StatBox
              label="Wallet Age"
              value={
                stats?.walletAgeDays !== undefined
                  ? `${stats.walletAgeDays} days`
                  : undefined
              }
            />
            <StatBox label="Total TXs" value={stats?.totalTx} />
            <StatBox
              label="Best Streak"
              value={
                stats?.bestStreak !== undefined
                  ? `🔥 ${stats.bestStreak} days`
                  : undefined
              }
            />
          </div>

          {tier && (
            <div
              style={{
                marginTop: 16,
                display: "flex",
                justifyContent: "center"
              }}
            >
              <div
                style={{
                  padding: "10px 18px",
                  borderRadius: 999,
                  background: "linear-gradient(90deg,#ffd7b8,#ffb07a)",
                  color: "#7a3a10",
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: "0.2px",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
                  opacity: 0.85
                }}
              >
                🆔 {tier.label} ID Mint — Soon
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: 14,
              fontSize: 11,
              opacity: 0.55,
              textAlign: "center"
            }}
          >
            Identity data powered by Farcaster & Base
          </div>
        </>
      )}

      <style>{`
        @keyframes km-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function StatBox({
  label,
  value
}: {
  label: string;
  value?: string | number;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: "14px 10px",
        textAlign: "center",
        boxShadow: "0 3px 10px rgba(0,0,0,0.05)"
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.6 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 16, marginTop: 4 }}>
        {value ?? "—"}
      </div>
    </div>
  );
}