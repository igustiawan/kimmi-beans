import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import MintButton from "@components/MintButton";
import { useAccount, useConnect } from "wagmi";

export default function App() {
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [fid, setFid] = useState<number | null>(null);
  const [username, setUsername] = useState<string>("");

  const SPECIAL_FID = 299929;

  // Wagmi hooks
  const { isConnected, address: wallet } = useAccount();
  const { connect, connectors } = useConnect();

  // Miniapp ready
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  // Load Farcaster Context
  useEffect(() => {
    async function load() {
      const ctx = await sdk.context;
      const user = ctx?.user;

      if (!user?.fid) return;

      setFid(user.fid);
      setUsername(user.username || "");

      // Check whitelist status
      const res = await fetch(`/api/checkWhitelist?fid=${user.fid}`);
      const json = await res.json();
      if (json.whitelisted) setIsWhitelisted(true);

      // Auto connect for special FID only
      if (user.fid === SPECIAL_FID && !isConnected) {
        connect({ connector: connectors[0] });
      }
    }

    load();
  }, [connect, connectors, isConnected]);

  // Join Whitelist
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

  return (
  <div className="container">
    <div className="card">

      <div className="title">Kimmi Beans</div>
      <div className="subtitle">Mint cute, unique beans every day!</div>

      <img src="/bean.gif" className="bean-img" alt="Kimmi Bean" />

      {/* === CONNECT WALLET — hanya user normal === */}
      {!isConnected && fid !== SPECIAL_FID && (
        <button
          className="main-btn"
          onClick={() => connect({ connector: connectors[0] })}
        >
          Connect Wallet
        </button>
      )}

      {/* === JOIN WHITELIST === */}
      {!isWhitelisted && (
        <button className="main-btn" onClick={joinWhitelist}>
          Join Whitelist
        </button>
      )}

      {/* === USER NORMAL (bukan special) === */}
      {isWhitelisted && fid !== SPECIAL_FID && (
        <>
          <button className="disabled-btn">Whitelisted ✓</button>
          <button
            className="share-btn"
            onClick={() =>
              sdk.actions.openUrl({
                url: `https://warpcast.com/~/compose?text=${encodeURIComponent(
                  "I just joined Kimmi Beans whitelist!"
                )}`,
              })
            }
          >
            Share to Cast
          </button>
        </>
      )}

      {/* === USER SPECIAL ONLY → MINT NFT === */}
      {isWhitelisted && fid === SPECIAL_FID && wallet && (
        <MintButton
          userAddress={wallet}
          fid={fid}
          username={"special-user"}
        />
      )}

      {/* Wallet Display */}
      {isConnected && wallet && (
        <div className="wallet-display">
          Wallet: {wallet.slice(0, 6)}...{wallet.slice(-4)}
        </div>
      )}

    </div>
  </div>
);
}