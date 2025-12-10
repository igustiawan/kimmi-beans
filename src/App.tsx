import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect, useReadContract } from "wagmi";
import MintButton from "./components/MintButton";
import EvolutionPanel from "./components/EvolutionPanel";
import careAbi from "./abi/kimmiBeansCare.json";

const DEV_FID = 299929;
const CONTRACT = import.meta.env.VITE_BEAN_CONTRACT as `0x${string}`;

export default function App() {
  const [tab, setTab] = useState<"mint" | "bean" | "rank" | "faq">("mint");

  const [userFID, setUserFID] = useState<number | null>(null);
  const isDev = userFID === DEV_FID;
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [pfp, setPfp] = useState<string | null>(null);

  // Mint state
  const [mintResult, setMintResult] = useState<{
    id: number;
    rarity: string;
    image: string;
  } | null>(null);

  const [soldOut, setSoldOut] = useState(false);
  const [totalMinted, setTotalMinted] = useState(0);
  const MAX_SUPPLY = 10000;

  // Wallet
  const { isConnected, address: wallet } = useAccount();
  const { connect, connectors } = useConnect();

  // Header counters (REAL from contract)
  const [dailyBeans, setDailyBeans] = useState(0);
  const [lifetimeXp, setLifetimeXp] = useState(0);

  /* ---------------------------------------------------------
     LOAD FID
  ---------------------------------------------------------- */
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

  /* ---------------------------------------------------------
     DIRECTLY READ STATS FROM CONTRACT (header always sync)
  ---------------------------------------------------------- */
  const { data: statsRaw } = useReadContract({
    address: CONTRACT,
    abi: careAbi,
    functionName: "getStats",
    args: wallet ? [wallet] : undefined,
    query: { enabled: Boolean(wallet) }
  });

  useEffect(() => {
    if (!statsRaw) return;

    const s = statsRaw as any;

    const xp = Number(s.xp);
    const beans = Number(s.beans);

    setLifetimeXp(xp);
    setDailyBeans(beans);

  }, [statsRaw]);

  /* ---------------------------------------------------------
     CHECK MINTED
  ---------------------------------------------------------- */
  useEffect(() => {
    async function checkMinted() {
      if (!wallet) return;

      const res = await fetch(`/api/checkMinted?wallet=${wallet}`);
      const data = await res.json();

      if (data.minted) {
        setMintResult({
          id: data.tokenId,
          rarity: data.rarity,
          image: data.image,
        });
      }
    }

    checkMinted();
  }, [wallet]);

  /* ---------------------------------------------------------
     SUPPLY
  ---------------------------------------------------------- */
  useEffect(() => {
    async function loadSupply() {
      const res = await fetch("/api/checkSupply");
      const data = await res.json();

      setTotalMinted(data.totalMinted);
      setSoldOut(data.soldOut);
    }

    loadSupply();
    const interval = setInterval(loadSupply, 10000);
    return () => clearInterval(interval);
  }, []);

  /* ---------------------------------------------------------
     SHARE AFTER MINT
  ---------------------------------------------------------- */
  async function shareToCast(tokenId: number, rarity: string) {
    const miniAppURL = "https://farcaster.xyz/miniapps/VV7PYCDPdD04/kimmi-beans";
    const msg = `I just minted Kimmi Bean #${tokenId} — Rarity: ${rarity} 🫘✨`;

    await sdk.actions.openUrl({
      url:
        `https://warpcast.com/~/compose?text=${encodeURIComponent(msg)}` +
        `&embeds[]=${encodeURIComponent(miniAppURL)}`
    });
  }

  /* ---------------------------------------------------------
     RENDER CONTENT
  ---------------------------------------------------------- */
  function renderContent() {
    // ------------------ MINT TAB ------------------
    if (tab === "mint") {
      return (
        <div className="card">
          <div className="title">Kimmi Beans</div>
          <div className="subtitle">Mint cute, unique beans every day!</div>

          <div className="counter">
            {soldOut ? (
              <b>🎉 Sold Out — 10000 / 10000</b>
            ) : (
              <b>{totalMinted} / {MAX_SUPPLY} Minted</b>
            )}
          </div>

          <div className="image-container">
            {mintResult ? (
              <img src={mintResult.image} alt="Minted Bean" />
            ) : (
              <img src="/bean.gif" alt="Bean" />
            )}
          </div>

          {!mintResult && (
            <>
              {!isConnected && (
                <button
                  className="main-btn"
                  onClick={() => connect({ connector: connectors[0] })}
                >
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
                    username={""}
                    onMintSuccess={(data) => {
                      setMintResult(data);
                      setTotalMinted((prev) => prev + 1);
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

              <button
                className="share-btn"
                onClick={() => shareToCast(mintResult.id, mintResult.rarity)}
              >
                Share to Cast 🚀
              </button>
            </>
          )}
        </div>
      );
    }

    // ------------------ MY BEAN TAB ------------------
    if (tab === "bean") {
      return isDev ? (
        <EvolutionPanel
          wallet={wallet}
          isConnected={isConnected}
          bean={mintResult}
          // masih boleh update header, tapi bukan satu-satunya sumber
          onStatsUpdate={(xp, beans) => {
            setLifetimeXp(xp);
            setDailyBeans(beans);
          }}
        />
      ) : (
        <div className="card">This feature is not available.</div>
      );
    }

    // ------------------ RANK ------------------
    if (tab === "rank") {
      return (
        <div className="card">
          <div className="title">Leaderboard</div>
          <p>Coming soon!</p>
        </div>
      );
    }

    // ------------------ FAQ ------------------
    if (tab === "faq") {
      return (
        <div className="card">
          <div className="title">FAQ</div>
          <p>Common questions will be shown here.</p>
        </div>
      );
    }
  }

  /* ---------------------------------------------------------
     FINAL RENDER
  ---------------------------------------------------------- */
  return (
    <div className="app">

      {/* HEADER */}
      <div className="header">
        <div className="header-left">
          {pfp ? (
            <img src={pfp} className="user-pfp" />
          ) : (
            <img src="/icon.png" className="user-pfp" />
          )}

          <span className="app-name">{displayName || "Guest"}</span>
        </div>

        <div className="header-right">
          <div className="header-badge">🫘 {dailyBeans}</div>
          <div className="header-badge">⭐ {lifetimeXp}</div>

          {wallet && (
            <div className="wallet-badge">
              {wallet.slice(0, 4)}...{wallet.slice(-3)}
            </div>
          )}
        </div>
      </div>

      {/* SCROLL CONTENT */}
      <div className="container">
        <div className="content-bg">
          {renderContent()}
        </div>
      </div>

      <div id="toast-root"></div>

      {/* BOTTOM NAV */}
      <div className="bottom-nav">
        <div
          className={`nav-item ${tab === "mint" ? "active" : ""}`}
          onClick={() => setTab("mint")}
        >
          🫘
          <span>Mint</span>
        </div>

        {isDev && (
          <div
            className={`nav-item ${tab === "bean" ? "active" : ""}`}
            onClick={() => setTab("bean")}
          >
            🌱
            <span>My Bean</span>
          </div>
        )}

        <div
          className={`nav-item ${tab === "rank" ? "active" : ""}`}
          onClick={() => setTab("rank")}
        >
          🏆
          <span>Rank</span>
        </div>

        <div
          className={`nav-item ${tab === "faq" ? "active" : ""}`}
          onClick={() => setTab("faq")}
        >
          ❓
          <span>FAQ</span>
        </div>
      </div>

    </div>
  );
}