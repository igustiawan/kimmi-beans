// src/components/LeaderboardPanel.tsx

type Player = {
  wallet: `0x${string}`;
  username?: string;
};

type Props = {
  leaderboard: Player[];
  loading: boolean;
  wallet?: `0x${string}`;
  onVisit: (wallet: `0x${string}`) => void;
  onShare: (rank: number | null) => void;
};

export default function LeaderboardPanel({
  leaderboard,
  loading,
  wallet,
  onVisit,
  onShare
}: Props) {
  // =========================
  // FULL LOADING SCENE
  // =========================
  if (loading) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "4px solid rgba(0,0,0,0.15)",
            borderTopColor: "#ff9548",
            animation: "km-spin 0.9s linear infinite"
          }}
        />

        <style>{`
          @keyframes km-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const userRank =
    leaderboard.findIndex(
      (p) => p.wallet.toLowerCase() === wallet?.toLowerCase()
    ) + 1;

  return (
    <div className="leaderboard-card">
      <div className="leader-title">🏆 Leaderboard</div>

      <div
        style={{
          textAlign: "center",
          fontSize: 13,
          opacity: 0.75,
          marginTop: -4,
          marginBottom: 10,
          fontWeight: 500
        }}
      >
        Season 1 — December 10, 2025 to January 10, 2026
      </div>

      {leaderboard.length === 0 ? (
        <p className="leader-loading">No players yet.</p>
      ) : (
        <>
          <div
            style={{
              width: "100%",
              overflowY: "auto",
              padding: "8px 0",
              maxHeight: "56vh"
            }}
          >
            <div className="leader-list">
              {leaderboard.slice(0, 100).map((p, index) => (
                <div
                  className="leader-item"
                  key={p.wallet}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div className="rank-num">{index + 1}</div>

                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div className="leader-name" style={{ fontWeight: 700 }}>
                        {p.username || p.wallet}
                      </div>
                      <div
                        className="leader-wallet"
                        style={{ fontSize: 12, opacity: 0.65 }}
                      >
                        {p.wallet.slice(0, 5)}...{p.wallet.slice(-3)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onVisit(p.wallet)}
                    style={{
                      display: "inline-flex",
                      gap: 8,
                      alignItems: "center",
                      padding: "6px 10px",
                      borderRadius: 12,
                      background: "linear-gradient(90deg,#ffd7b8,#ffb07a)",
                      border: "none",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
                    }}
                  >
                    👀 <span style={{ fontSize: 13 }}>Visit</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {wallet && (
            <div
              className="user-rank-box"
              style={{
                marginTop: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div>
                <span className="user-rank-label">Your Rank</span>
                <span className="user-rank-value" style={{ marginLeft: 8 }}>
                  {userRank > 0 ? `#${userRank}` : "Not in Top 100"}
                </span>
              </div>

              <button
                onClick={() => onShare(userRank > 0 ? userRank : null)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 20,
                  background: "#ff9548",
                  color: "white",
                  border: "none",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.15)"
                }}
              >
                🚀 Share Progress
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}