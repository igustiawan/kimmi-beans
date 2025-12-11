// src/components/tabs/RankTab.tsx
import React from "react";

interface Props {
  leaderboard: any[];
  loadingRank: boolean;
  wallet?: string | null;
}

export default function RankTab({ leaderboard, loadingRank, wallet }: Props) {
  const userRank = leaderboard.findIndex((p) => p.wallet.toLowerCase() === wallet?.toLowerCase()) + 1;

  if (loadingRank) return <div className="card"><div className="leader-title">🏆 Leaderboard</div><p>Loading...</p></div>;

  return (
    <div className="leaderboard-card">
      <div className="leader-title">🏆 Leaderboard</div>

      {leaderboard.length === 0 ? (
        <p className="leader-loading">No players yet.</p>
      ) : (
        <>
          <div style={{ width: "100%", overflowY: "auto", padding: "8px 0", maxHeight: "56vh" }}>
            <div className="leader-list">
              {leaderboard.slice(0, 100).map((p, index) => (
                <div className="leader-item" key={p.wallet}>
                  <div className="leader-left">
                    <div className="rank-num">{index + 1}</div>
                    <div className="leader-info">
                      <div className="leader-name">{p.username || p.wallet}</div>
                      <div className="leader-wallet">{p.wallet.slice(0, 5)}...{p.wallet.slice(-3)}</div>
                    </div>
                  </div>
                  <div className="leader-right">
                    <span className="leader-stat">Lvl {p.level}</span>
                    <span className="leader-stat">🫘 {p.beans}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {wallet && (
            <div className="user-rank-box" style={{ marginTop: 12 }}>
              <span className="user-rank-label">Your Rank</span>
              <span className="user-rank-value" style={{ marginLeft: 8 }}>
                {userRank > 0 ? `#${userRank}` : "Not in Top 100"}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}