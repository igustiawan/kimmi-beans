// src/App.tsx
import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect } from "wagmi";
import MyIDPanel from "./components/MyIDPanel";
import FAQPanel from "./components/FAQPanel";
import LeaderboardPanel from "./components/LeaderboardPanel";
import BeanPanel from "./components/BeanPanel";
import MintPanel from "./components/MintPanel";
import BeanViewer from "./components/BeanViewer";
import { useLeaderboard } from "./hooks/useLeaderboard";
import { useMintStatus } from "./hooks/useMintStatus";
import { useHeaderStats } from "./hooks/useHeaderStats";

type Tab = "mint" | "bean" | "rank" | "faq" | "id";

export default function App() {
  const [tab, setTab] = useState<Tab>("mint");

  const [userFID, setUserFID] = useState<number | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [pfp, setPfp] = useState<string | null>(null);

  const {
    leaderboard,
    loading: loadingRank,
    refresh: refreshLeaderboard
  } = useLeaderboard(tab);

  const [soldOut, setSoldOut] = useState(false);
  const [totalMinted, setTotalMinted] = useState(0);
  const MAX_SUPPLY = 10000;
  const { isConnected, address: wallet } = useAccount();
  const { connect, connectors } = useConnect();
  const CONTRACT = import.meta.env.VITE_BEAN_CONTRACT as `0x${string}`;
  const [viewBeanWallet, setViewBeanWallet] = useState<`0x${string}` | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const {
    mintResult,
    setMintResult,
    mintImageLoading,
    preloadedMintImage,
    appLoading
  } = useMintStatus(wallet);

  const hasMinted = Boolean(mintResult);

  const {
    dailyBeans,
    lifetimeXp,
    lifetimeLevel,
    refreshHeaderStats,
    ready: headerStatsReady
  } = useHeaderStats(wallet);


  useEffect(() => {
    if (hasMinted && tab === "mint") {
      setTab("bean");
    }
  }, [hasMinted, tab]);

  // ============================================================
  // Load FID (still read for display, but no dev-only logic)
  // ============================================================
  useEffect(() => {
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

  function handleStatsUpdate(newXp: number, newBeans: number) {
    refreshHeaderStats();
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

    function sanitizeLine(s: string) {
      const noZW = s.replace(/[\u200B-\u200F\uFEFF]/g, "");
      return noZW.trim();
    }

    const cleanedLines = lines.map(sanitizeLine);
    while (cleanedLines.length && cleanedLines[0] === "") cleanedLines.shift();
    while (cleanedLines.length && cleanedLines[cleanedLines.length - 1] === "") cleanedLines.pop();
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

  // Share the most-recent mint result (token id + rarity + image)
  async function shareMintResult() {
    if (!mintResult) {
      setToast("Nothing to share yet");
      setTimeout(() => setToast(null), 1400);
      return;
    }

    const miniAppURL = "https://farcaster.xyz/miniapps/VV7PYCDPdD04/kimmi-beans";

    function sanitizeLine(s: string) {
      const noZW = s.replace(/[\u200B-\u200F\uFEFF]/g, "");
      return noZW.trim();
    }

    const lines = [
      `I just minted a Kimmi Bean! 🌱`,
      `Token #${mintResult.id} — Rarity: ${mintResult.rarity}`,
      "",
      `Come mint your own at the Kimmi Beans mini-app! @kimmi`
    ].map(sanitizeLine).filter(Boolean);

    const finalText = lines.join("\n");

    try {
      let url =
        `https://warpcast.com/~/compose?text=${encodeURIComponent(finalText)}` +
        `&embeds[]=${encodeURIComponent(miniAppURL)}`;

      if (mintResult.image) {
        url += `&embeds[]=${encodeURIComponent(mintResult.image)}`;
      }

      await sdk.actions.openUrl({ url });
    } catch (err) {
      console.warn("shareMintResult failed", err);
      setToast("Unable to open compose");
      setTimeout(() => setToast(null), 1600);
    }
  }

  // safeSetTab simplified (no daily guard)
  function safeSetTab(t: Tab) {
    setViewBeanWallet(null);
    setTab(t);
  }

  // ============================================================
  // RENDER content per tab
  // ============================================================
  function renderContent() {
    if (viewBeanWallet) {
      return (
        <BeanViewer
          wallet={viewBeanWallet}
          leaderboard={leaderboard}
          contract={CONTRACT}
          onClose={() => setViewBeanWallet(null)}
        />
      );
    }

    if (tab === "mint") {
      return (
        <MintPanel
          isConnected={isConnected}
          wallet={wallet}
          soldOut={soldOut}
          totalMinted={totalMinted}
          maxSupply={MAX_SUPPLY}
          mintResult={mintResult}
          mintImageLoading={mintImageLoading}
          preloadedMintImage={preloadedMintImage}
          fid={userFID ?? 0}
          username={displayName || ""}
          onConnect={() => connect({ connector: connectors[0] })}
          onMintSuccess={(d) => {
            setMintResult(d);
            setTotalMinted((prev) => prev + 1);
            setTimeout(() => setTab("bean"), 600);
          }}
          onShare={shareMintResult}
        />
      );
    }

    if (tab === "bean") {
      return (
        <BeanPanel
          wallet={wallet ?? null}
          isConnected={isConnected}
          mintResult={mintResult}
          fid={userFID}
          username={displayName}
          headerStatsReady={headerStatsReady}
          onGoMint={() => setTab("mint")}
          onStatsUpdate={(xp, beans) => {
            handleStatsUpdate(xp, beans);
            refreshLeaderboard();
          }}
        />
      );
    }

    if (tab === "rank") {
      return (
        <LeaderboardPanel
          leaderboard={leaderboard}
          loading={loadingRank}
          wallet={wallet}
          onVisit={(wallet) => setViewBeanWallet(wallet)}
          onShare={(rank) => shareProgressFromLeaderboard(rank)}
        />
      );
    }

    if (tab === "faq") {
      return <FAQPanel />;
    }

    if (tab === "id") {
        return (
          <MyIDPanel
            fid={userFID}
            displayName={displayName}
            pfp={pfp}
            wallet={wallet ?? null}
          />
        );
    }

    return null;
  }

  // ============================================================
  // UI Layout
  // ============================================================
    return (
      <>
        {appLoading ? (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "linear-gradient(180deg,#fff6f0,#ffe6ca)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999
            }}
          >
            {/* optical center wrapper */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                transform: "translateY(-6px)" 
              }}
            >
              <div
                style={{
                  width: 36,         
                  height: 36,
                  borderRadius: "50%",
                  border: "3px solid rgba(0,0,0,0.15)",
                  borderTopColor: "#ff9548",
                  animation: "km-spin 0.9s linear infinite"
                }}
              />

              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  opacity: 0.6,
                  fontWeight: 500,
                  letterSpacing: "0.2px"
                }}
              >
                Loading…
              </div>

              <style>{`
                @keyframes km-spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          </div>
        ) : (
          // =========================
          // REAL APP (NO GLITCH)
          // =========================
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
                    {wallet && (
                      <span className="wallet-badge">
                        {wallet.slice(0, 6)}…{wallet.slice(-4)}
                      </span>
                    )}
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
              {!hasMinted && (
                <div
                  className={`nav-item ${tab === "mint" ? "active" : ""}`}
                  onClick={() => safeSetTab("mint")}
                >
                  🫘<span>Mint</span>
                </div>
              )}

              <div
                className={`nav-item ${tab === "bean" ? "active" : ""}`}
                onClick={() => safeSetTab("bean")}
              >
                🌱<span>My Bean</span>
              </div>

              <div
                className={`nav-item ${tab === "id" ? "active" : ""}`}
                onClick={() => safeSetTab("id")}
              >
                🆔<span>My ID</span>
              </div>

              <div
                className={`nav-item ${tab === "rank" ? "active" : ""}`}
                onClick={() => safeSetTab("rank")}
              >
                🏆<span>Rank</span>
              </div>

              <div
                className={`nav-item ${tab === "faq" ? "active" : ""}`}
                onClick={() => safeSetTab("faq")}
              >
                ❓<span>FAQ</span>
              </div>
            </div>

            {toast && <div className="toast-popup">{toast}</div>}
          </div>
        )}
      </>
    );
}