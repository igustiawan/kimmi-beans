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

  // Viewer state: which wallet we're viewing (null = none)
  const [viewBeanWallet, setViewBeanWallet] = useState<string | null>(null);

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
    // attempt to open add-miniapp if supported (safe optional)
    (sdk.actions as any).addMiniApp?.();
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
    query: { enabled: Boolean(wallet) } // keep as you had it; adjust if your wagmi uses a different option shape
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

      await sdk.actions.openUrl({ url });
    } catch (err) {
      console.warn("openUrl failed", err);
      setToast("Unable to open compose");
      setTimeout(() => setToast(null), 1600);
    }
  }

  // safeSetTab simplified (no daily guard)
  function safeSetTab(t: Tab) {
    // ensure any open viewer is closed when switching tabs
    setViewBeanWallet(null);
    setTab(t);
  }

  // ============================================================
  // helper to refresh leaderboard on demand
  // (declared before renderContent so it's available)
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
  // BeanViewer component (inline for convenience)
  // ============================================================
  function BeanViewer({ wallet: viewWallet, onClose }: { wallet: string; onClose: () => void }) {
    const { data: statsRaw } = useReadContract({
      address: CONTRACT,
      abi: careAbi,
      functionName: "getStats",
      args: [viewWallet],
      query: { enabled: Boolean(viewWallet) }
    });

    const [meta, setMeta] = useState<{ tokenId?: number; rarity?: string; image?: string } | null>(null);
    const [loadingMeta, setLoadingMeta] = useState(false);

    useEffect(() => {
      let mounted = true;
      async function loadMeta() {
        setLoadingMeta(true);
        try {
          const res = await fetch(`/api/checkMinted?wallet=${viewWallet}`);
          const data = await res.json();
          if (!mounted) return;
          if (data.minted) {
            setMeta({
              tokenId: data.tokenId,
              rarity: data.rarity,
              image: data.image
            });
          } else {
            setMeta(null);
          }
        } catch (err) {
          console.warn("BeanViewer: failed to load meta", err);
          if (mounted) setMeta(null);
        } finally {
          if (mounted) setLoadingMeta(false);
        }
      }
      loadMeta();
      return () => { mounted = false; };
    }, [viewWallet]);

    const stats = statsRaw as StatsStruct | undefined;
    const player = leaderboard.find((p) => p.wallet.toLowerCase() === viewWallet.toLowerCase());

    const rank = player ? leaderboard.findIndex((p) => p.wallet.toLowerCase() === viewWallet.toLowerCase()) + 1 : null;

    async function followUser() {
      try {
        const username = player?.username;
        // if username exists, use follow by username; otherwise open the wallet profile
        const url = username ? `https://warpcast.com/~/follow/${username}` : `https://warpcast.com/${viewWallet}`;
        await sdk.actions.openUrl({ url });
      } catch (err) {
        console.warn("followUser failed", err);
        setToast("Unable to open follow");
        setTimeout(() => setToast(null), 1600);
      }
    }

    async function sendCompliment() {
      try {
        const username = player?.username ? `@${player.username} ` : "";
        const text = `${username}Your bean is awesome! 🌱🔥`;
        const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`;
        await sdk.actions.openUrl({ url });
      } catch (err) {
        console.warn("sendCompliment failed", err);
        setToast("Unable to open compose");
        setTimeout(() => setToast(null), 1600);
      }
    }

    return (
      <div style={{
        padding: 18,
        maxWidth: 480,
        margin: "0 auto",
      }}>

        <button
          onClick={onClose}
          style={{
            display: "inline-block",
            marginBottom: 12,
            background: "transparent",
            border: "none",
            color: "#ff7f2e",
            cursor: "pointer",
            fontWeight: 700
          }}
        >
          ← Back
        </button>

        <div style={{ background: "linear-gradient(180deg,#fff6f0,#ffe6ca)", borderRadius: 14, padding: 18, textAlign: "center" }}>
          <div style={{ width: 220, height: 220, margin: "0 auto", borderRadius: 14, background: "#0f1724", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {loadingMeta ? (
              <div>Loading image…</div>
            ) : meta?.image ? (
              <img src={meta.image} alt="bean" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
            ) : (
              <img src="/bean.gif" alt="bean" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
            )}
          </div>

          <h2 style={{ marginTop: 12 }}>{player?.username || `${viewWallet.slice(0,6)}…${viewWallet.slice(-4)}`}</h2>
          {/* <p style={{ marginTop: 6, marginBottom: 6, color: "#444" }}>{viewWallet}</p> */}

          <div style={{ display: "flex", justifyContent: "space-around", marginTop: 12 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700 }}>{stats ? Number(stats.level) : "—"}</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Level</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700 }}>{stats ? Number(stats.xp) : "—"}</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>XP</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700 }}>{stats ? Number(stats.beans) : "—"}</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Beans</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700 }}>{rank ?? "—"}</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Rank</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "center" }}>
            <button onClick={followUser} style={{ padding: "8px 12px", borderRadius: 12, background: "#ffb07a", border: "none", fontWeight: 700, cursor: "pointer" }}>
              ⭐ Follow this player
            </button>

            <button onClick={sendCompliment} style={{ padding: "8px 12px", borderRadius: 12, background: "#fff", border: "1px solid #eee", fontWeight: 700, cursor: "pointer" }}>
              💬 Send Compliment
            </button>
          </div>

          {meta?.tokenId && (
            <div style={{ marginTop: 12, fontSize: 13, color: "#333" }}>
              Token #{meta.tokenId} — Rarity: <b>{meta.rarity}</b>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER content per tab
  // ============================================================
  function renderContent() {
    // If viewing a bean, render the viewer (takes precedence)
    if (viewBeanWallet) {
      return <BeanViewer wallet={viewBeanWallet} onClose={() => setViewBeanWallet(null)} />;
    }

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

    // RANK (Leaderboard)
    if (tab === "rank") {
      const userRank = leaderboard.findIndex(
        (p) => p.wallet.toLowerCase() === wallet?.toLowerCase()
      ) + 1;

      return (
        <div className="leaderboard-card">
          <div className="leader-title">🏆 Leaderboard</div>

          <div style={{
            textAlign: "center",
            fontSize: "13px",
            opacity: 0.75,
            marginTop: "-4px",
            marginBottom: "10px",
            fontWeight: 500
          }}>
            Season 1 — December 10, 2025 to January 10, 2026
          </div>

          {loadingRank ? (
            <p className="leader-loading">Loading...</p>
          ) : leaderboard.length === 0 ? (
            <p className="leader-loading">No players yet.</p>
          ) : (
            <>
              <div style={{ width: "100%", overflowY: "auto", padding: "8px 0", maxHeight: "56vh" }}>
                <div className="leader-list">
                  {leaderboard.slice(0, 100).map((p, index) => (
                    <div
                      className="leader-item"
                      key={p.wallet}
                      onClick={() => setViewBeanWallet(p.wallet)}
                      style={{ cursor: "pointer" }}
                    >
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

    // FAQ as leaderboard-style list
    if (tab === "faq") {
      const faqList = [
        { icon: "🫘", q: "What is Kimmi Beans?", a: "A fun Farcaster Mini App where you mint and grow your own Bean NFT." },
        { icon: "⚡", q: "How do I earn XP & Beans?", a: "Take care of your Bean every day by feeding, watering, and training it." },
        { icon: "📈", q: "Which action gives the best reward?", a: "Train > Water > Feed — higher difficulty gives higher XP & Beans reward." },
        { icon: "💰", q: "What are Beans used for?", a: "Beans increase leaderboard ranking and unlock future rewards." },
        { icon: "🔒", q: "How many NFTs can I mint?", a: "Only 1 NFT per wallet — your Bean is unique and yours forever." },
        { icon: "🔵", q: "Is this on Base?", a: "Yes — all minting and actions run on the Base blockchain." },
      ];

      return (
        <div className="faq-wrapper" role="region" aria-label="FAQ area">
          {/* Header stays above the scrollable list */}
          <div className="faq-header" aria-hidden="true">
            {/* reuse leader-title size so FAQ header matches leaderboard */}
            <div className="leader-title" style={{ margin: 0 }}>FAQ</div>
          </div>

          {/* Only this list scrolls */}
          <div className="faq-list" aria-live="polite">
            {faqList.map((item, i) => (
              <div className="leader-item" key={i}>
                <div className="leader-left">
                  {/* rank-num area visually — we put icon inside similar box */}
                  <div style={{
                    minWidth: 40,
                    minHeight: 40,
                    borderRadius: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(180deg,#fff6f0,#ffe6ca)",
                    color: "#ff7f2e",
                    fontSize: 18,
                    boxShadow: "0 3px 8px rgba(255,127,46,0.06)"
                  }}>
                    {item.icon}
                  </div>

                  <div className="leader-info" style={{ marginTop: -1 }}>
                    <div className="leader-name" style={{ fontWeight: 700 }}>{item.q}</div>
                    <div className="leader-wallet" style={{ fontSize: 12, opacity: 0.65 }}>{item.a}</div>
                  </div>
                </div>

                {/* right side kept empty to match leaderboard spacing (or could show a small badge) */}
                <div className="leader-right" aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // default fallback
    return null;
  }

  // ============================================================
  // UI Layout
  // ============================================================
  return (
    <div className="app">
      {/* HEADER */}
      <div className="header" role="banner">
        <div className="header-inner">
          <div className="header-left">
            <img src={pfp || "/icon.png"} className="user-pfp" alt="pfp" />
            <span className="app-name">{displayName || "Kimmi"}</span>
          </div>

          <div className="header-right">
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span className="header-badge">🫘 {dailyBeans}</span>
              <span className="header-badge">⭐ {lifetimeXp}</span>
              {wallet && <span className="wallet-badge">{wallet.slice(0, 6)}…{wallet.slice(-4)}</span>}
            </div>
          </div>
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