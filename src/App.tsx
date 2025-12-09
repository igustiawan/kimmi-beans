import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import MintButton from "./components/MintButton";
import { useAccount, useConnect } from "wagmi";

export default function App() {

  // === REMOVE WHITELIST ===
  // const SPECIAL_FID = 299929;
  // const [fid, setFid] = useState<number | null>(null);
  // const [username, setUsername] = useState<string>("");
  // const [isWhitelisted, setIsWhitelisted] = useState(false);

  // Mint result (NFT info)
  const [mintResult, setMintResult] = useState<{
    id: number;
    rarity: string;
    image: string;
  } | null>(null);

  // Live counter
  const [soldOut, setSoldOut] = useState(false);
  const [totalMinted, setTotalMinted] = useState(0);
  const MAX_SUPPLY = 10000;

  const { isConnected, address: wallet } = useAccount();
  const { connect, connectors } = useConnect();

  /** Miniapp Ready */
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  /** LOAD USER — REMOVE WHITELIST */
  /*
  useEffect(() => {
    async function load() {
      const ctx = await sdk.context;
      const user = ctx?.user;
      if (!user) return;

      setFid(user.fid);
      setUsername(user.username ?? "");

      const res = await fetch(`/api/checkWhitelist?fid=${user.fid}`);
      const json = await res.json();
      if (json.whitelisted) setIsWhitelisted(true);

      if (user.fid === SPECIAL_FID && !isConnected) {
        connect({ connector: connectors[0] });
      }
    }
    load();
  }, [isConnected, connect, connectors]);
  */

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

  /** OLD WHITELIST — REMOVED */
  /*
  async function joinWhitelist() {
    if (!fid) return;

    const ctx = await sdk.context;
    const user = ctx?.user;

    const res = await fetch("/api/joinWhitelist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "fc-request-signature": "verified",
      },
      body: JSON.stringify({
        fid: user.fid,
        username: user.username,
      }),
    });

    const json = await res.json();
    if (json.success) setIsWhitelisted(true);
  }
  */

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
            {/* Connect wallet */}
            {!isConnected && (
              <button
                className="main-btn"
                onClick={() => connect({ connector: connectors[0] })}
              >
                Connect Wallet
              </button>
            )}

            {/* Mint button for everyone */}
            {isConnected && wallet && (
              soldOut ? (
                <button className="disabled-btn">Sold Out 🎉</button>
              ) : (
                <MintButton
                  userAddress={wallet}
                  fid={0}           // FID removed
                  username={""}     // Username removed
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
              className="main-btn share-btn"
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
    </div>
  );
}