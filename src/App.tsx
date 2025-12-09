import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect } from "wagmi";
import MintButton from "./components/MintButton";
import EvolutionPanel from "./components/EvolutionPanel";

const DEV_FID = 299929; // Only dev sees My Bean tab

export default function App() {
  const [tab, setTab] = useState<"mint" | "bean" | "rank" | "faq">("mint");

  const [userFID, setUserFID] = useState<number | null>(null);
  const isDev = userFID === DEV_FID;

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

  const [dailyBeans] = useState(0);
  const [lifetimeXp] = useState(0);

  /* Load FID */
  useEffect(() => {
    sdk.actions.ready();
    (async () => {
      const ctx = await sdk.context;
      const user = ctx?.user;
      if (user) setUserFID(user.fid);
    })();
  }, []);

  /* Check if wallet has minted before */
  useEffect(() => {
    if (!wallet) return;
    (async () => {
      const res = await fetch(`/api/checkMinted?wallet=${wallet}`);
      const data = await res.json();
      if (data.minted) {
        setMintResult({
          id: data.tokenId,
          rarity: data.rarity,
          image: data.image,
        });
      }
    })();
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

  /* Share cast */
  async function shareToCast(id: number, rarity: string) {
    const miniAppURL = "https://farcaster.xyz/miniapps/VV7PYCDPdD04/kimmi-beans";
    const text = `I just minted Kimmi Bean #${id} — Rarity: ${rarity} 🫘✨`;

    await sdk.actions.openUrl({
      url:
        `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`
        + `&embeds[]=${encodeURIComponent(miniAppURL)}`
    });
  }

  /* Main content */
  function renderContent() {
    if (tab === "mint") {
      return (
        <div className="card">
          <div className="title">Kimmi Beans</div>
          <div className="subtitle">Mint cute, unique beans every day!</div>

          <div className="counter">
            {soldOut
              ? <b>🎉 Sold Out — 10000 / 10000</b>
              : <b>{totalMinted} / {MAX_SUPPLY} Minted</b>
            }
          </div>

          <div className="image-container">
            {mintResult
              ? <img src={mintResult.image} />
              : <img src="/bean.gif" />
            }
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
                    username=""
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

          {wallet && (
            <div className="wallet-display">
              Wallet: {wallet.slice(0, 6)}...{wallet.slice(-4)}
            </div>
          )}
        </div>
      );
    }

    if (tab === "bean") {
      return isDev
        ? (
          <EvolutionPanel
            wallet={wallet}
            isConnected={isConnected}
            mintRarity={mintResult?.rarity ?? null}
          />
        )
        : <div className="card">This feature is not available.</div>;
    }

    if (tab === "rank") {
      return (
        <div className="card">
          <div className="title">Leaderboard</div>
          <p>Coming soon!</p>
        </div>
      );
    }

    if (tab === "faq") {
      return (
        <div className="card">
          <div className="title">FAQ</div>
          <p>Common questions will be shown here.</p>
        </div>
      );
    }
  }

  return (
    <div className="app">

      {/* Header */}
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

      {/* Scrollable Content */}
      <div className="container">
        <div className="content-bg">
          {renderContent()}
        </div>
      </div>

      {/* Bottom Navigation */}
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