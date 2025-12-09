import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect } from "wagmi";
import MintButton from "./components/MintButton";
import EvolutionPanel from "./components/EvolutionPanel";

// Only you can see My Bean tab
const DEV_FID = 299929;

export default function App() {
  const [tab, setTab] = useState<"mint" | "bean" | "rank" | "faq">("mint");

  const [userFID, setUserFID] = useState<number | null>(null);
  const isDev = userFID === DEV_FID;

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

  // Header counters (dummy for now)
  const [dailyBeans] = useState(0);
  const [lifetimeXp] = useState(0);

  /* Load FID */
  useEffect(() => {
    sdk.actions.ready();

    async function loadFID() {
      const ctx = await sdk.context;
      const user = ctx?.user;
      if (user) setUserFID(user.fid);
    }

    loadFID();
  }, []);

  /* Check if wallet has minted */
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

  /* Load supply */
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

  /* Share after mint */
  async function shareToCast(tokenId: number, rarity: string) {
    const miniAppURL = "https://farcaster.xyz/miniapps/VV7PYCDPdD04/kimmi-beans";
    const msg = `I just minted Kimmi Bean #${tokenId} — Rarity: ${rarity} 🫘✨`;

    await sdk.actions.openUrl({
      url:
        `https://warpcast.com/~/compose?text=${encodeURIComponent(msg)}` +
        `&embeds[]=${encodeURIComponent(miniAppURL)}`
    });
  }

  // ============================================================
  // CONTENT RENDERING
  // ============================================================
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

          {/* Before mint */}
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

          {/* After mint */}
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

          {/* Wallet */}
          {wallet && (
            <div className="wallet-display">
              Wallet: {wallet.slice(0, 6)}...{wallet.slice(-4)}
            </div>
          )}
        </div>
      );
    }

    // ------------------ MY BEAN TAB (DEV ONLY) ------------------
    if (tab === "bean") {
      return isDev ? (
        <EvolutionPanel
          wallet={wallet}
          isConnected={isConnected}
          mintRarity={mintResult?.rarity ?? null}
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

  // ============================================================
  // FINAL STRUCTURE — matches CSS layout
  // ============================================================
  return (
    <div className="app">

      {/* -------- HEADER -------- */}
      <div className="header">
        <div className="header-left">
          <img src="/icon.png" className="app-icon" />
          <span className="app-name">Kimmi Beans</span>
        </div>

        <div className="header-right">
          <div className="header-badge">🫘 {dailyBeans}</div>
          <div className="header-badge">⭐ {lifetimeXp}</div>
        </div>
      </div>

      {/* -------- SCROLLABLE CONTENT -------- */}
      <div className="container">
        {renderContent()}
      </div>

      {/* -------- BOTTOM NAV -------- */}
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
