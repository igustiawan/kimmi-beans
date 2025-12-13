// src/App.tsx
import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect, useReadContract } from "wagmi";

import careAbi from "./abi/kimmiBeansCare.json";
import { useMiniAppBoot } from "./hooks/useMiniAppBoot";

// layout / ui
import HeaderBar from "./components/HeaderBar";
import BottomNav from "./components/BottomNav";

// sections
import MintSection from "./sections/MintSection";
import RankSection from "./sections/RankSection";
import FAQSection from "./sections/FAQSection";
import BeanViewer from "./sections/BeanViewer";
import EvolutionPanel from "./components/EvolutionPanel";

type Tab = "mint" | "bean" | "rank" | "faq";

export default function App() {

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingRank, setLoadingRank] = useState(false);

  // ------------------------------------------------------------
  // WALLET
  // ------------------------------------------------------------
  const { isConnected, address: wallet } = useAccount();
  const { connect, connectors } = useConnect();

  // ------------------------------------------------------------
  // MINI APP BOOT (SDK + FID + MINT STATE)
  // ------------------------------------------------------------
  const {
    booting,
    userFID,
    displayName,
    pfp,
    hasMinted,
    mintResult,
    mintImageLoading,
    preloadedMintImage,
  } = useMiniAppBoot(wallet);

  // ------------------------------------------------------------
  // BASIC UI STATE
  // ------------------------------------------------------------
  const [tab, setTab] = useState<Tab>("mint");
  const [toast, setToast] = useState<string | null>(null);

  const [viewBeanWallet, setViewBeanWallet] = useState<string | null>(null);

  // ------------------------------------------------------------
  // AUTO SWITCH TAB AFTER MINT
  // ------------------------------------------------------------
  useEffect(() => {
    if (hasMinted && tab === "mint") {
      setTab("bean");
    }
  }, [hasMinted, tab]);

  // ------------------------------------------------------------
  // CONTRACT / HEADER STATS
  // ------------------------------------------------------------
  const CONTRACT = import.meta.env.VITE_BEAN_CONTRACT as `0x${string}`;

  type StatsStruct = {
    xp: bigint;
    level: bigint;
    beans: bigint;
    lastAction: bigint;
  };

  const [dailyBeans, setDailyBeans] = useState(0);
  const [lifetimeXp, setLifetimeXp] = useState(0);
  const [lifetimeLevel, setLifetimeLevel] = useState(0);

  const { data: headerStatsRaw, refetch: refetchHeaderStats } =
    useReadContract({
      address: CONTRACT,
      abi: careAbi,
      functionName: "getStats",
      args: wallet ? [wallet] : undefined,
      query: { enabled: Boolean(wallet) },
    });

  useEffect(() => {
    if (!headerStatsRaw) return;
    const s = headerStatsRaw as StatsStruct;
    setLifetimeXp(Number(s.xp));
    setDailyBeans(Number(s.beans));
    setLifetimeLevel(Number(s.level));
  }, [headerStatsRaw]);

  function handleStatsUpdate(xp: number, beans: number) {
    setLifetimeXp(xp);
    setDailyBeans(beans);
    refetchHeaderStats();
  }

  // ------------------------------------------------------------
  // SHARE HELPERS
  // ------------------------------------------------------------
  async function shareMintResult() {
    if (!mintResult) return;

    const miniAppURL =
      "https://farcaster.xyz/miniapps/VV7PYCDPdD04/kimmi-beans";

    const text = [
      `I just minted a Kimmi Bean! 🌱`,
      `Token #${mintResult.id} — Rarity: ${mintResult.rarity}`,
      "",
      `Come mint yours 👇`,
    ].join("\n");

    try {
      let url =
        `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}` +
        `&embeds[]=${encodeURIComponent(miniAppURL)}`;

      if (mintResult.image) {
        url += `&embeds[]=${encodeURIComponent(mintResult.image)}`;
      }

      await sdk.actions.openUrl({ url });
    } catch {
      setToast("Unable to open compose");
      setTimeout(() => setToast(null), 1400);
    }
  }

  async function shareProgress(rank?: number | null) {
    const miniAppURL =
      "https://farcaster.xyz/miniapps/VV7PYCDPdD04/kimmi-beans";

    const text = [
      `My Kimmi Bean is growing strong 🌱`,
      `Lvl ${lifetimeLevel} — ${dailyBeans} Beans${rank ? ` — Rank #${rank}` : ""}`,
      "",
      `Join Kimmi Beans 👇`,
    ].join("\n");

    try {
      const url =
        `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}` +
        `&embeds[]=${encodeURIComponent(miniAppURL)}`;

      await sdk.actions.openUrl({ url });
    } catch {
      setToast("Unable to open compose");
      setTimeout(() => setToast(null), 1400);
    }
  }

  // ------------------------------------------------------------
  // BOOT SCREEN (HARD GATE)
  // ------------------------------------------------------------
  if (booting) {
    return (
      <div className="boot-screen">
        <img src="/bean.gif" width={96} />
        <div style={{ marginTop: 12, opacity: 0.7 }}>
          Growing your Bean…
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  // RENDER CONTENT
  // ------------------------------------------------------------
  function renderContent() {
    if (viewBeanWallet) {
      return (
        <BeanViewer
          wallet={viewBeanWallet}
          contract={CONTRACT}
          onClose={() => setViewBeanWallet(null)}
        />
      );
    }

    if (tab === "mint") {
      return (
        <MintSection
          wallet={wallet}
          isConnected={isConnected}
          connect={() => connect({ connector: connectors[0] })}
          hasMinted={hasMinted}
          mintResult={mintResult}
          mintImageLoading={mintImageLoading}
          preloadedMintImage={preloadedMintImage}
          onShareMint={shareMintResult}
        />
      );
    }

    if (tab === "bean") {
      if (!wallet || !mintResult || !headerStatsRaw) return null;

      return (
        <EvolutionPanel
          wallet={wallet}
          isConnected={isConnected}
          bean={mintResult}
          fid={userFID}
          username={displayName}
          onStatsUpdate={handleStatsUpdate}
        />
      );
    }

    if (tab === "rank") {
      return (
        <RankSection
          wallet={wallet}
          leaderboard={leaderboard}
          loading={loadingRank}
          lifetimeLevel={lifetimeLevel}
          dailyBeans={dailyBeans}
          onVisitBean={(w) => setViewBeanWallet(w)}
          onToast={(msg) => {
            setToast(msg);
            setTimeout(() => setToast(null), 1600);
          }}
        />
      );
    }

    if (tab === "faq") {
      return <FAQSection />;
    }

    return null;
  }

  // ------------------------------------------------------------
  // UI LAYOUT
  // ------------------------------------------------------------
  return (
    <div className="app">
      <HeaderBar
        pfp={pfp}
        displayName={displayName}
        beans={dailyBeans}
        xp={lifetimeXp}
        wallet={wallet}
      />

      <div className="content-bg">{renderContent()}</div>

      <BottomNav
        tab={tab}
        hasMinted={hasMinted}
        onChange={(t) => setTab(t)}
      />

      {toast && <div className="toast-popup">{toast}</div>}
    </div>
  );
}