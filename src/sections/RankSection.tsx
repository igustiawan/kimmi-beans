// src/sections/RankSection.tsx
import { sdk } from "@farcaster/miniapp-sdk";

type RankSectionProps = {
  wallet?: `0x${string}`;
  leaderboard: any[];
  loading: boolean;

  lifetimeLevel: number;
  dailyBeans: number;

  onVisitBean: (wallet: string) => void;
  onToast: (msg: string) => void;
};

export default function RankSection({
  wallet,
  leaderboard,
  loading,
  lifetimeLevel,
  dailyBeans,
  onVisitBean,
  onToast,
}: RankSectionProps) {
  const userRank =
    wallet
      ? leaderboard.findIndex(
          (p) =>
            p.wallet?.toLowerCase() === wallet.toLowerCase()
        ) + 1
      : 0;

  async function shareProgress() {
    const miniAppURL =
      "https://farcaster.xyz/miniapps/VV7PYCDPdD04/kimmi-beans";

    const lines = [
      `My Kimmi Bean is growing strong! 🌱`,
      `Lvl ${lifetimeLevel} — ${dailyBeans} Beans${
        userRank > 0 ? ` — Rank #${userRank}` : ""
      }`,
      "",
      `Come grow your own Bean on Kimmi Beans!`,
    ];

    const text = lines.join("\n");

    try {
      const url =
        `https://warpcast.com/~/compose?text=${encodeURIComponent(
          text
        )}` +
        `&embeds[]=${encodeURIComponent(miniAppURL)}`;

      await sdk.actions.openUrl({ url });
    } catch {
      onToast("Unable to open compose");
    }
  }

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
          fontWeight: 500,
        }}
      >
        Season 1 — December 10, 2025 to January 10, 2026
      </div>

      {loading ? (
        <p className="leader-loading">Loading...</p>
      ) : leaderboard.length === 0 ? (
        <p className="leader-loading">No players yet.</p>
      ) : (
        <>
          {/* LIST */}
          <div
            style={{
              width: "100%",
              overflowY: "auto",
              padding: "8px 0",
              maxHeight: "56vh",
            }}
          >
            <div className="leader-list">
              {leaderboard
                .slice(0, 100)
                .map((p, index) => (
                  <div
                    className="leader-item"
                    key={p.wallet}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        "space-between",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <div className="rank-num">
                        {index + 1}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <div
                          className="leader-name"
                          style={{
                            fontWeight: 700,
                          }}
                        >
                          {p.username ||
                            p.wallet.slice(
                              0,
                              6
                            ) +
                              "…" +
                              p.wallet.slice(-4)}
                        </div>

                        <div
                          className="leader-wallet"
                          style={{
                            fontSize: 12,
                            opacity: 0.65,
                          }}
                        >
                          {p.wallet.slice(
                            0,
                            5
                          )}
                          …
                          {p.wallet.slice(-3)}
                        </div>
                      </div>
                    </div>

                    {/* VISIT */}
                    <button
                      onClick={() =>
                        onVisitBean(p.wallet)
                      }
                      style={{
                        display:
                          "inline-flex",
                        gap: 8,
                        alignItems:
                          "center",
                        padding:
                          "6px 10px",
                        borderRadius: 12,
                        background:
                          "linear-gradient(90deg,#ffd7b8,#ffb07a)",
                        border: "none",
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow:
                          "0 2px 6px rgba(0,0,0,0.08)",
                      }}
                    >
                      👀 Visit
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* USER FOOTER */}
          {wallet && (
            <div
              className="user-rank-box"
              style={{
                marginTop: 12,
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span className="user-rank-label">
                  Your Rank
                </span>
                <span
                  className="user-rank-value"
                  style={{
                    marginLeft: 8,
                  }}
                >
                  {userRank > 0
                    ? `#${userRank}`
                    : "Not in Top 100"}
                </span>
              </div>

              <button
                onClick={shareProgress}
                style={{
                  padding: "8px 14px",
                  borderRadius: 20,
                  background: "#ff9548",
                  color: "white",
                  border: "none",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  boxShadow:
                    "0 2px 4px rgba(0,0,0,0.15)",
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