import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import MintButton from "./components/MintButton";
import EvolutionPanel from "./components/EvolutionPanel";
import { useAccount, useConnect } from "wagmi";

const DEV_FID = 299929;

export default function App() {
  const [tab, setTab] = useState<"mint" | "bean" | "leaderboard" | "faq">("mint");
  const [userFID, setUserFID] = useState<number | null>(null);

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

  /** Miniapp Ready + Load FID */
  useEffect(() => {
    sdk.actions.ready();
    async function loadFID() {
      const ctx = await sdk.context;
      const user = ctx?.user;
      if (user) setUserFID(user.fid);
    }
    loadFID();
  }, []);

  const isDev = userFID === DEV_FID;

  /** CHECK IF WALLET ALREADY MINTED */
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
            image: data.image,
          });
        }
      } catch (e) {
        console.error("Mint check error:", e);
      }
    }

    checkMinted();
  }, [wallet]);

  /** LIVE SUPPLY COUNTER */
  useEffect(() => {
    async function loadSupply() {
      try {
        const res = await fetch("/api/checkSupply");
        const data = await res.json();

        setTotalMinted(data.totalMinted);
        setSoldOut(data.soldOut);
      } catch (e) {
        console.error("Error fetching supply:", e);
      }
    }

    loadSupply();
    const interval = setInterval(loadSupply, 10000);
    return () => clearInterval(interval);
  }, []);

  /** Share to Warpcast */
  async function shareToCast(tokenId: number, rarity: string) {
    const miniAppURL = "https://farcaster.xyz/miniapps/VV7PYCDPdD04/kimmi-beans";
    const msg = `I just minted Kimmi Bean #${tokenId} — Rarity: ${rarity} 🫘✨`;

    await sdk.actions.openUrl({
      url:
        `https://warpcast.com/~/compose?text=${encodeURIComponent(msg)}` +
        `&embeds[]=${encodeURIComponent(miniAppURL)}`
    });
  }

  // =====================================================
  //                    TAB CONTENT
  // =====================================================

  function renderContent() {
    if (tab === "mint") {
      return (
        <div className="card">
          <div className="title">Kimmi Beans</div>
          <div className="subtitle">Mint cute, unique beans every day!</div>

          {/* Counter */}
          <div className="counter">
            {soldOut ?
              (<b>🎉 Sold Out — 10,000 / 10,000</b>) :
              (<b>{totalMinted} / {MAX_SUPPLY} Minted</b>)
            }
          </div>

          {/* Image */}
          <div className="image-container">
            {mintResult ? (
              <img src={mintResult.image} className="minted-img" />
            ) : (
              <img src="/bean.gif" />
            )}
          </div>

          {/* Mint Flow */}
          {!mintResult ? (
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
                  <button className="disabled-btn">Sold Out 🎉</button>
                ) : (
                  <MintButton
                    userAddress={wallet}
                    fid={0}
                    username={""}
                    onMintSuccess={(data) => {
                      setMintResult(data);
                      setTotalMinted((n) => n + 1);
                    }}
                  />
                )
              )}
            </>
          ) : (
            <div className="section">
              <div className="mint-info">
                Token #{mintResult.id} — Rarity: <b>{mintResult.rarity}</b>
              </div>

              <button
                className="share-btn"
                onClick={() => shareToCast(mintResult.id, mintResult.rarity)}
              >
                Share to Cast 🚀
              </button>
            </div>
          )}

          {/* Wallet shown */}
          {isConnected && wallet && (
            <div className="wallet-display">
              Wallet: {wallet.slice(0, 6)}...{wallet.slice(-4)}
            </div>
          )}
        </div>
      );
    }

    if (tab === "bean") {
      return isDev ? (
        <EvolutionPanel
          wallet={wallet}
          isConnected={isConnected}
          mintRarity={mintResult?.rarity ?? null}
        />
      ) : (
        <div className="locked">Feature not available</div>
      );
    }

    if (tab === "leaderboard") {
      return <div className="card"><div className="title">Leaderboard</div></div>;
    }

    if (tab === "faq") {
      return <div className="card"><div className="title">FAQ</div></div>;
    }
  }

  return (
    <div className="container">
      {renderContent()}

      {/* =====================================================
            BOTTOM NAVIGATION
      ===================================================== */}
      <div className="bottom-nav">

        {/* Mint */}
        <button
          className={tab === "mint" ? "nav-item active" : "nav-item"}
          onClick={() => setTab("mint")}
        >
          🫘
          <span>Mint</span>
        </button>

        {/* My Bean — only developer */}
        {isDev && (
          <button
            className={tab === "bean" ? "nav-item active" : "nav-item"}
            onClick={() => setTab("bean")}
          >
            🌱
            <span>My Bean</span>
          </button>
        )}

        {/* Leaderboard */}
        <button
          className={tab === "leaderboard" ? "nav-item active" : "nav-item"}
          onClick={() => setTab("leaderboard")}
        >
          🏆
          <span>Rank</span>
        </button>

        {/* FAQ */}
        <button
          className={tab === "faq" ? "nav-item active" : "nav-item"}
          onClick={() => setTab("faq")}
        >
          ❓
          <span>FAQ</span>
        </button>

      </div>
    </div>
  );
}
