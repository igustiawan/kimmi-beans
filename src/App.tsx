import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import MintButton from "./components/MintButton";
import EvolutionPanel from "./components/EvolutionPanel"; // akan kamu isi nanti
import { useAccount, useConnect } from "wagmi";

// === ENV CHECK ===
const APP_ENV = import.meta.env.VITE_APP_ENV || "prod";
const IS_DEV = APP_ENV === "dev";

export default function App() {
  const [tab, setTab] = useState<"mint" | "bean">("mint");

  // MINT STATE
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

  /** Miniapp Ready */
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  /** Load Minted NFT */
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

  /** Live Supply Counter */
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

  /** Share after mint */
  async function shareToCast(tokenId: number, rarity: string) {
    const miniAppURL =
      "https://farcaster.xyz/miniapps/VV7PYCDPdD04/kimmi-beans";

    const msg = `I just minted Kimmi Bean #${tokenId} — Rarity: ${rarity} 🫘✨`;

    await sdk.actions.openUrl({
      url:
        `https://warpcast.com/~/compose?text=${encodeURIComponent(msg)}` +
        `&embeds[]=${encodeURIComponent(miniAppURL)}`
    });
  }

  return (
    <div className="container">

      {/* === DEV MODE LABEL === */}
      {IS_DEV && (
        <div className="dev-banner">
          🚧 DEV MODE — New features visible only to you
        </div>
      )}

      {/* === TOP TABS === */}
      <div className="tabs-wrapper">
        <div className="tabs">
          
          {/* Tab Mint — always visible */}
          <button
            className={tab === "mint" ? "active" : ""}
            onClick={() => setTab("mint")}
          >
            Mint
          </button>

          {/* Tab My Bean — only visible in DEV */}
          {IS_DEV && (
            <button
              className={tab === "bean" ? "active" : ""}
              onClick={() => setTab("bean")}
            >
              My Bean
            </button>
          )}
        </div>
      </div>

      {/* === TAB: My Bean (DEV ONLY) === */}
      {tab === "bean" && IS_DEV && (
        <EvolutionPanel
          wallet={wallet}
          isConnected={isConnected}
          mintRarity={mintResult?.rarity ?? null}
        />
      )}

      {/* === TAB: Mint === */}
      {tab === "mint" && (
        <div className="card">
          <div className="title">Kimmi Beans</div>
          <div className="subtitle">Mint cute, unique beans every day!</div>

          {/* LIVE COUNTER */}
          <div className="counter">
            {soldOut ? (
              <b>🎉 Sold Out — 10,000 / 10,000</b>
            ) : (
              <b>
                {totalMinted.toLocaleString()} / {MAX_SUPPLY.toLocaleString()} Minted
              </b>
            )}
          </div>

          {/* IMAGE */}
          <div className="image-container">
            {mintResult ? (
              <img src={mintResult.image} className="minted-img" alt="Minted Bean" />
            ) : (
              <img src="/bean.gif" alt="Bean" />
            )}
          </div>

          {/* BEFORE MINT */}
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
          )}

          {/* AFTER MINT */}
          {mintResult && (
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

          {/* WALLET DISPLAY */}
          {isConnected && wallet && (
            <div className="wallet-display">
              Wallet: {wallet.slice(0, 6)}...{wallet.slice(-4)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
