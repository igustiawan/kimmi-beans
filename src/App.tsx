// src/App.tsx
import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect, useReadContract } from "wagmi";
import MintButton from "./components/MintButton";
import EvolutionPanel from "./components/EvolutionPanel";
import careAbi from "./abi/kimmiBeansCare.json";

type Tab = "mint" | "bean" | "rank" | "faq";

export default function App() {
  const [tab, setTab] = useState<Tab>("mint");

  const [userFID, setUserFID] = useState<number | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [pfp, setPfp] = useState<string | null>(null);

  const [mintResult, setMintResult] = useState<{
    id: number;
    rarity: string;
    image: string;
  } | null>(null);

  const [soldOut, setSoldOut] = useState(false);
  const [totalMinted, setTotalMinted] = useState(0);

  const MAX_SUPPLY = 10000;

  const { isConnected, address: wallet } = useAccount();
  const { connect, connectors } = useConnect();

  const CONTRACT = import.meta.env.VITE_BEAN_CONTRACT as `0x${string}`;

  // Header values
  const [dailyBeans, setDailyBeans] = useState(0);
  const [lifetimeXp, setLifetimeXp] = useState(0);
  const [lifetimeLevel, setLifetimeLevel] = useState(0); // show level in leaderboard share

  // STATE UNTUK LEADERBOARD
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingRank, setLoadingRank] = useState(false);

  // small toast root (keperluan ringan)
  const [toast, setToast] = useState<string | null>(null);

  // LOAD LEADERBOARD (top 100) when rank tab is opened; also used for share
  useEffect(() => {
    if (tab !== "rank") return;

    async function loadRank() {
      setLoadingRank(true);
      try {
        const res = await fetch("/api/leaderboard");
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
      } catch (err) {
        console.error("Failed to load leaderboard", err);
        setLeaderboard([]);
      } finally {
        setLoadingRank(false);
      }
    }

    loadRank();
  }, [tab]);

  // ============================================================
  // Load FID (still read for display, but no dev-only logic)
  // ============================================================
  useEffect(() => {
    sdk.actions.ready();
    async function loadFID() {
      const ctx = await sdk.context;
      const user = ctx?.user;
      if (user) {
        setUserFID(user.fid);
        setDisplayName(user.displayName || null);
        setPfp(user.pfpUrl || null);
      }
    }
    loadFID();
  }, []);

  // ============================================================
  // Check minted NFT
  // ============================================================
  useEffect(() => {
    async function checkMinted() {
      if (!wallet) return;

      try {
        const res = await fetch(`/api/checkMinted?wallet=${wallet}`);
        const data = await res.json();

        if (data.minted) {
          setMintResult({
            id: data.tokenId,
            rarity: data.rarity,
            image: data.image
          });
        } else {
          setMintResult(null);
        }
      } catch (err) {
        console.error("checkMinted error", err);
      }
    }
    checkMinted();
  }, [wallet]);

  // ============================================================
  // Auto-load stats for header directly from CONTRACT
  // ============================================================
  type StatsStruct = {
    xp: bigint;
    level: bigint;
    beans: bigint;
    lastAction: bigint;
  };

  const { data: headerStatsRaw, refetch: refetchHeaderStats } = useReadContract({
    address: CONTRACT,
    abi: careAbi,
    functionName: "getStats",
    args: wallet ? [wallet] : undefined,
    query: { enabled: Boolean(wallet) }
  });

  useEffect(() => {
    if (!headerStatsRaw) return;

    const stats = headerStatsRaw as StatsStruct;

    setLifetimeXp(Number(stats.xp));
    setDailyBeans(Number(stats.beans));
    setLifetimeLevel(Number(stats.level));
  }, [headerStatsRaw]);

  function handleStatsUpdate(newXp: number, newBeans: number) {
    setLifetimeXp(newXp);
    setDailyBeans(newBeans);
    refetchHeaderStats();
  }

  // ============================================================
  // Load supply
  // ============================================================
  useEffect(() => {
    async function loadSupply() {
      try {
        const res = await fetch("/api/checkSupply");
        const data = await res.json();

        setTotalMinted(data.totalMinted);
        setSoldOut(data.soldOut);
      } catch (err) {
        console.error("loadSupply error", err);
      }
    }

    loadSupply();
    const interval = setInterval(loadSupply, 10000);
    return () => clearInterval(interval);
  }, []);

  // ============================================================
  // Share to Cast helper (used by leaderboard small share button)
  // ============================================================
  async function shareProgressFromLeaderboard(rank?: number | null) {
    const miniAppURL = "https://farcaster.xyz/miniapps/VV7PYCDPdD04/kimmi-beans";

    // raw lines (no leading newline, start immediately)
    const lines = [
      `My Kimmi Bean is growing strong! 🌱`,
      `Lvl ${lifetimeLevel} — ${dailyBeans} Beans${rank ? ` — Rank #${rank}` : ""}`,
      "",
      `Come join the Kimmi Beans mini-game on Farcaster!`,
      `Mint your own Bean, level it up, climb the leaderboard,`,
      `and flex your progress with the community!`,
      "",
      `Let’s grow together`
    ];

    // sanitize: remove BOM / zero-width chars, normalize newlines, trim lines
    function sanitizeLine(s: string) {
      // Remove BOM and zero-width spaces / non-printing chars
      const noZW = s.replace(/[\u200B-\u200F\uFEFF]/g, "");
      // Trim spaces on both ends
      return noZW.trim();
    }

    const cleanedLines = lines.map(sanitizeLine);

    // Remove accidental empty leading lines
    while (cleanedLines.length && cleanedLines[0] === "") cleanedLines.shift();
    // Remove trailing empty lines
    while (cleanedLines.length && cleanedLines[cleanedLines.length - 1] === "") cleanedLines.pop();

    // Join with single blank line between paragraphs where there's an empty string in the array
    // (we already have "" in lines to show paragraph breaks)
    const finalText = cleanedLines.join("\n");

    try {
      const url =
        `https://warpcast.com/~/compose?text=${encodeURIComponent(finalText)}` +
        `&embeds[]=${encodeURIComponent(miniAppURL)}`;

      // debug: you can console.log(url) to inspect the encoded text if needed
      // console.log("Share URL:", url);

      await sdk.actions.openUrl({ url });
    } catch (err) {
      console.warn("openUrl failed", err);
      setToast("Unable to open compose");
      setTimeout(() => setToast(null), 1600);
    }
  }

  // safeSetTab simplified (no daily guard)
  function safeSetTab(t: Tab) {
    setTab(t);
  }

  // ============================================================
  // helper to refresh leaderboard on demand
  // ============================================================
  async function fetchLeaderboardNow() {
    try {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } catch (err) {
      console.warn("fetchLeaderboardNow failed", err);
    }
  }

  // ============================================================
  // RENDER content per tab
  // ============================================================
  function renderContent() {
    // MINT
    if (tab === "mint") {
      return (
        <div className="card">
          <div className="title">Kimmi Beans</div>
          <div className="subtitle">Mint cute, unique beans every day!</div>

          <div className="image-container">
            {mintResult ? (
              <img src={mintResult.image} alt="Minted Bean" />
            ) : (
              <img src="/bean.gif" alt="Bean" />
            )}
          </div>

          <div className="counter">
            {soldOut ? (
              <b>🎉 Sold Out — 10000 / 10000</b>
            ) : (
              <b>{totalMinted} / {MAX_SUPPLY} Minted</b>
            )}
          </div>

          {!mintResult && (
            <>
              {!isConnected && (
                <button className="main-btn" onClick={() => connect({ connector: connectors[0] })}>
                  Connect Wallet
                </button>
              )}

              {isConnected && wallet && (
                soldOut ? (
                  <button className="main-btn disabled">Sold Out 🎉</button>
                ) : (
                  <MintButton
                    userAddress={wallet}
                    fid={userFID ?? 0}
                    username={displayName || ""}
                    onMintSuccess={(d) => {
                      setMintResult(d);
                      setTotalMinted((prev) => prev + 1);
                      setTimeout(() => window.location.reload(), 400);
                    }}
                  />
                )
              )}
            </>
          )}

          {mintResult && (
            <>
              <div className="mint-info">
                Token #{mintResult.id} — Rarity: <b>{mintResult.rarity}</b>
              </div>

              <button className="share-btn" onClick={() => shareProgressFromLeaderboard(null)}>
                Share to Cast 🚀
              </button>
            </>
          )}
        </div>
      );
    }

    // MY BEAN
    if (tab === "bean") {
      if (!isConnected || !wallet) {
        return (
          <div className="card">
            <div className="title">My Bean</div>
            <p>Please connect your wallet first.</p>
          </div>
        );
      }

      if (!mintResult) {
        return (
          <div className="card">
            <div className="title">My Bean</div>
            <p>You don’t own a Kimmi Bean NFT yet.</p>
            <button className="main-btn" onClick={() => setTab("mint")}>Mint Now 🫘</button>
          </div>
        );
      }

      return (
        <EvolutionPanel
          wallet={wallet}
          isConnected={isConnected}
          bean={mintResult}
          fid={userFID}
          username={displayName}
          onStatsUpdate={(xp, beans) => {
            handleStatsUpdate(xp, beans);
            // refresh leaderboard when stats change so rank is accurate
            if (tab === "bean" || tab === "rank") {
              fetchLeaderboardNow();
            }
          }}
        />
      );
    }

    // RANK (Leaderboard) — now includes small share button next to Your Rank
    if (tab === "rank") {
      const userRank = leaderboard.findIndex(
        (p) => p.wallet.toLowerCase() === wallet?.toLowerCase()
      ) + 1;

      return (
        <div className="leaderboard-card">
          <div className="leader-title">🏆 Leaderboard</div>

          {loadingRank ? (
            <p className="leader-loading">Loading...</p>
          ) : leaderboard.length === 0 ? (
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
                <div className="user-rank-box" style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span className="user-rank-label">Your Rank</span>
                    <span className="user-rank-value" style={{ marginLeft: 8 }}>
                      {userRank > 0 ? `#${userRank}` : "Not in Top 100"}
                    </span>
                  </div>

                  {/* Small share button placed to the right of Your Rank */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => shareProgressFromLeaderboard(userRank > 0 ? userRank : null)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "20px",
                        background: "#ff9548",
                        color: "white",
                        border: "none",
                        fontWeight: 700,
                        fontSize: "14px",
                        cursor: "pointer",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.15)"
                      }}
                    >
                      🚀 Share Progress
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    // FAQ
    if (tab === "faq") {
      return (
        <div className="card">
          <div className="title">FAQ</div>
          <div style={{ textAlign: "left", width: "100%", maxWidth: 420 }}>
            <div style={{ marginBottom: 12 }}>
              <b>🫘 What is Kimmi Beans?</b>
              <div style={{ opacity: 0.9 }}>A fun Farcaster Mini App where you mint and grow your own Bean NFT.</div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <b>⚡ How do I earn XP & Beans?</b>
              <div style={{ opacity: 0.9 }}>Take care of your Bean every day by feeding, watering, and training it.</div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <b>📈 Which action gives the best reward?</b>
              <div style={{ opacity: 0.9 }}>Train &gt; Water &gt; Feed — higher difficulty = higher XP & Beans reward.</div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <b>💰 What are Beans used for?</b>
              <div style={{ opacity: 0.9 }}>Beans increase leaderboard ranking and unlock future rewards.</div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <b>🔒 How many NFTs can I mint?</b>
              <div style={{ opacity: 0.9 }}>Only 1 NFT per wallet — your Bean is unique and yours forever.</div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <b>🔵 Is this on Base?</b>
              <div style={{ opacity: 0.9 }}>Yes! All minting and actions run on Base blockchain.</div>
            </div>
          </div>
        </div>
      );
    }
  }

  // ============================================================
  // UI Layout
  // ============================================================
  return (
    <div className="app">
      {/* HEADER */}
      <div className="header">
        <div className="header-left">
          <img src={pfp || "/icon.png"} className="user-pfp" />
          <span className="app-name">{displayName || "Guest"}</span>
        </div>

        <div className="header-right">
          <div className="header-stats">
            <div className="header-badge">🫘 {dailyBeans}</div>
            <div className="header-badge">⭐ {lifetimeXp}</div>
          </div>

          {wallet && (
            <div className="wallet-badge">
              {wallet.slice(0, 4)}...{wallet.slice(-3)}
            </div>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className={`content-bg ${tab === "rank" ? "leader-mode" : ""}`}>
        {renderContent()}
      </div>

      <div id="toast-root"></div>

      {/* NAV */}
      <div className="bottom-nav">
        <div className={`nav-item ${tab === "mint" ? "active" : ""}`} onClick={() => safeSetTab("mint")}>
          🫘<span>Mint</span>
        </div>

        <div className={`nav-item ${tab === "bean" ? "active" : ""}`} onClick={() => safeSetTab("bean")}>
          🌱<span>My Bean</span>
        </div>

        <div className={`nav-item ${tab === "rank" ? "active" : ""}`} onClick={() => safeSetTab("rank")}>
          🏆<span>Rank</span>
        </div>

        <div className={`nav-item ${tab === "faq" ? "active" : ""}`} onClick={() => safeSetTab("faq")}>
          ❓<span>FAQ</span>
        </div>
      </div>

      {/* small toast */}
      {toast && (
        <div className="toast-popup">{toast}</div>
      )}
    </div>
  );
}