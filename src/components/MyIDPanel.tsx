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

export default function MyIDPanel({
  fid,
  displayName,
  pfp,
  wallet
}: MyIDPanelProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<IdentityStats | null>(null);

  useEffect(() => {
    if (!wallet || !fid) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadIdentity() {
      try {
        const res = await fetch(
          `/api/identity?wallet=${wallet}&fid=${fid}`
        );
        const data = await res.json();
        if (!mounted) return;

        setStats({
          neynarScore: data.neynarScore,
          activeDays: data.activeDays,
          walletAgeDays: data.walletAgeDays,
          totalTx: data.totalTx,
          bestStreak: data.bestStreak
        });
      } catch (err) {
        console.warn("Failed to load identity", err);
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
          background: "linear-gradient(180deg,#fff6f0,#ffe6ca)",
          borderRadius: 16,
          padding: 18,
          textAlign: "center",
          boxShadow: "0 6px 18px rgba(0,0,0,0.06)"
        }}
      >
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

        {fid && (
          <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>
            FID {fid}
          </div>
        )}

        {stats?.neynarScore !== undefined && (
          <div
            style={{
              marginTop: 10,
              fontSize: 13,
              fontWeight: 700
            }}
          >
            Neynar Score{" "}
            <span style={{ color: "#ff7f2e" }}>
              {stats.neynarScore.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* STATS GRID */}
      <div
        style={{
            position: "relative",
            marginTop: 14,
            minHeight: 170 // cukup untuk spinner + konten
        }}
        >
        {/* LOADING SPINNER */}
        {loading && (
            <div
            style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none"
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

        {/* CONTENT AFTER LOADED */}
        {!loading && (
            <>
            {/* STATS GRID */}
            <div
                style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12
                }}
            >
                <StatBox label="Active Days" value={stats?.activeDays} loading={false} />
                <StatBox
                label="Wallet Age"
                value={
                    stats?.walletAgeDays !== undefined
                    ? `${stats.walletAgeDays} days`
                    : undefined
                }
                loading={false}
                />
                <StatBox label="Total TXs" value={stats?.totalTx} loading={false} />
                <StatBox
                label="Best Streak"
                value={
                    stats?.bestStreak !== undefined
                    ? `🔥 ${stats.bestStreak} days`
                    : undefined
                }
                loading={false}
                />
            </div>

            {/* CTA */}
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
                🆔 Minting ID — Soon
                </div>
            </div>

            {/* FOOTNOTE */}
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
    </div>
  );
}

function StatBox({
  label,
  value,
  loading
}: {
  label: string;
  value?: string | number;
  loading: boolean;
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
        {loading ? "—" : value ?? "—"}
      </div>
    </div>
  );
}