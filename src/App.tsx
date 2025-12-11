// src/App.tsx
import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect, useReadContract } from "wagmi";
import careAbi from "./abi/kimmiBeansCare.json";

import { useDaily } from "./hooks/useDaily";
import MintTab from "./components/tabs/MintTab";
import BeanTab from "./components/tabs/BeanTab";
import RankTab from "./components/tabs/RankTab";
import DailyTab from "./components/tabs/DailyTab";
import FaqTab from "./components/tabs/FaqTab";


type Tab = "mint" | "bean" | "rank" | "faq" | "daily";
const DEV_FID = 299929;
const MINI_APP_URL = "https://farcaster.xyz/miniapps/VV7PYCDPdD04/kimmi-beans";

export default function App() {
  const [tab, setTab] = useState<Tab>("mint");
  const { isConnected, address: wallet } = useAccount();
  const { connect, connectors } = useConnect();

  // user info
  const [userFID, setUserFID] = useState<number | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [pfp, setPfp] = useState<string | null>(null);

  // mint + supply
  const [mintResult, setMintResult] = useState<{id:number, rarity:string, image:string} | null>(null);
  const [soldOut, setSoldOut] = useState(false);
  const [totalMinted, setTotalMinted] = useState(0);
  const MAX_SUPPLY = 10000;

  // header stats
  const [dailyBeans, setDailyBeans] = useState(0);
  const [lifetimeXp, setLifetimeXp] = useState(0);

  // leaderboard
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingRank, setLoadingRank] = useState(false);

  // daily hook
  const daily = useDaily(wallet ?? null, displayName, lifetimeXp, dailyBeans);

  // read contract for header stats
  const CONTRACT = import.meta.env.VITE_BEAN_CONTRACT as `0x${string}`;
  type StatsStruct = { xp: bigint; level: bigint; beans: bigint; lastAction: bigint; };
  const { data: headerStatsRaw, refetch: refetchHeaderStats } = useReadContract({
    address: CONTRACT,
    abi: careAbi,
    functionName: "getStats",
    args: wallet ? [wallet] : undefined,
    query: { enabled: Boolean(wallet) }
  });

  useEffect(() => {
    sdk.actions.ready();
    (async function loadFID() {
      const ctx = await sdk.context;
      const user = ctx?.user;
      if (user) {
        setUserFID(user.fid);
        setDisplayName(user.displayName || null);
        setPfp(user.pfpUrl || null);
      }
    })();
  }, []);

  useEffect(() => {
    if (!headerStatsRaw) return;
    const stats = headerStatsRaw as StatsStruct;
    setLifetimeXp(Number(stats.xp));
    setDailyBeans(Number(stats.beans));
  }, [headerStatsRaw]);

  function handleStatsUpdate(newXp:number, newBeans:number) {
    setLifetimeXp(newXp);
    setDailyBeans(newBeans);
    refetchHeaderStats();
  }

  // load minted + supply similar to before (omitted for brevity)...
  useEffect(() => {
    // checkMinted
    (async function() {
      if (!wallet) return;
      try {
        const res = await fetch(`/api/checkMinted?wallet=${wallet}`);
        const data = await res.json();
        if (data.minted) setMintResult({ id: data.tokenId, rarity: data.rarity, image: data.image });
        else setMintResult(null);
      } catch (err) { console.error(err); }
    })();
  }, [wallet]);

  // leaderboard loader
  useEffect(() => {
    if (tab !== "rank") return;
    (async function loadRank() {
      setLoadingRank(true);
      try {
        const res = await fetch("/api/leaderboard");
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
      } catch (err) {
        setLeaderboard([]);
      } finally { setLoadingRank(false); }
    })();
  }, [tab]);

  // safeSetTab (dev guard)
  function safeSetTab(t: Tab) {
    if (t === "daily" && userFID !== DEV_FID) {
      // show small toast via hook
      daily.setDailyToast?.("Daily tab is currently for tester FID only.");
      setTimeout(() => daily.setDailyToast?.(null), 1800);
      return;
    }
    setTab(t);
  }

  // renderContent: delegate to tab components
  function renderContent() {
    if (tab === "mint") {
      return (
        <MintTab
          isConnected={isConnected}
          wallet={wallet}
          mintResult={mintResult}
          soldOut={soldOut}
          totalMinted={totalMinted}
          MAX_SUPPLY={MAX_SUPPLY}
          connect={() => connect({ connector: connectors[0] })}
          onMintSuccess={(d) => {
            setMintResult(d);
            setTotalMinted(prev => prev + 1);
            setTimeout(() => window.location.reload(), 400);
          }}
        />
      );
    }

    if (tab === "bean") {
      return (
        <BeanTab
          wallet={wallet}
          isConnected={isConnected}
          mintResult={mintResult}
          lifetimeXp={lifetimeXp}
          dailyBeans={dailyBeans}
          dailyLoading={daily.dailyLoading}
          dailySummary={daily.dailySummary}
          canInteract={daily.canInteract}
          hasBeanStats={daily.hasBeanStats}
          onRefreshDaily={daily.fetchDailyStatus}
          onShare={async () => {
            // open composer via SDK then mark
            const lvl = daily.dailySummary.level ?? Math.floor(lifetimeXp / 100);
            const beans = daily.dailySummary.beans ?? dailyBeans;
            const rankText = daily.dailySummary.rank ? `#${daily.dailySummary.rank}` : "Not ranked";
            const usernameText = daily.dailySummary.username || displayName || wallet;
            const msg = `${usernameText} — Kimmi Bean progress: Lvl ${lvl} • 🫘 ${beans} • ${rankText} — main di Kimmi Beans! ${MINI_APP_URL}`;

            try {
              await sdk.actions.openUrl({
                url: `https://warpcast.com/~/compose?text=${encodeURIComponent(msg)}&embeds[]=${encodeURIComponent(MINI_APP_URL)}`
              });
            } catch (e) { console.warn("openUrl failed", e); }

            await daily.markSharedOptimistic(userFID);
          }}
          onStatsUpdate={handleStatsUpdate}
          fid={userFID}
          displayName={displayName}
        />
      );
    }

    if (tab === "rank") {
      return <RankTab leaderboard={leaderboard} loadingRank={loadingRank} wallet={wallet} />;
    }

    if (tab === "daily") {
      return (
        <DailyTab
          wallet={wallet}
          displayName={displayName}
          lifetimeXp={lifetimeXp}
          dailyBeans={dailyBeans}
          dailyLoading={daily.dailyLoading}
          dailySummary={daily.dailySummary}
          canInteract={daily.canInteract}
          hasBeanStats={daily.hasBeanStats}
          onRefresh={() => daily.fetchDailyStatus()}
          onShare={async () => {
            const lvl = daily.dailySummary.level ?? Math.floor(lifetimeXp / 100);
            const beans = daily.dailySummary.beans ?? dailyBeans;
            const rankText = daily.dailySummary.rank ? `#${daily.dailySummary.rank}` : "Not ranked";
            const usernameText = daily.dailySummary.username || displayName || wallet;
            const msg = `${usernameText} — Kimmi Bean progress: Lvl ${lvl} • 🫘 ${beans} • ${rankText} — main di Kimmi Beans! ${MINI_APP_URL}`;

            try {
              await sdk.actions.openUrl({
                url: `https://warpcast.com/~/compose?text=${encodeURIComponent(msg)}&embeds[]=${encodeURIComponent(MINI_APP_URL)}`
              });
            } catch (e) { console.warn("openUrl failed", e); }

            await daily.markSharedOptimistic(userFID);
          }}
        />
      );
    }

    if (tab === "faq") return <FaqTab />;
  }

  return (
    <div className="app">
      {/* header */}
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

          {wallet && <div className="wallet-badge">{wallet.slice(0,4)}...{wallet.slice(-3)}</div>}
        </div>
      </div>

      <div className={`content-bg ${tab === "rank" ? "leader-mode" : ""}`}>
        {renderContent()}
      </div>

      <div id="toast-root"></div>

      <div className="bottom-nav">
        <div className={`nav-item ${tab === "mint" ? "active" : ""}`} onClick={() => safeSetTab("mint")}>🫘<span>Mint</span></div>
        <div className={`nav-item ${tab === "bean" ? "active" : ""}`} onClick={() => safeSetTab("bean")}>🌱<span>My Bean</span></div>
        <div className={`nav-item ${tab === "rank" ? "active" : ""}`} onClick={() => safeSetTab("rank")}>🏆<span>Rank</span></div>
        {userFID === DEV_FID && <div className={`nav-item ${tab === "daily" ? "active" : ""}`} onClick={() => safeSetTab("daily")}>🚀<span>Daily</span></div>}
        <div className={`nav-item ${tab === "faq" ? "active" : ""}`} onClick={() => safeSetTab("faq")}>❓<span>FAQ</span></div>
      </div>

      {daily.dailyToast && <div className="toast-popup">{daily.dailyToast}</div>}
    </div>
  );
}