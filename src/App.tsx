import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import MintButton from "./components/MintButton";
import { useAccount, useConnect } from "wagmi";

export default function App() {
  const SPECIAL_FID = 299929;

  const [fid, setFid] = useState<number | null>(null);
  const [username, setUsername] = useState<string>("");
  const [isWhitelisted, setIsWhitelisted] = useState(false);

  // ⬇️ NEW: hasil mint
  const [mintResult, setMintResult] = useState<{
    id: number;
    rarity: string;
  } | null>(null);

  const { isConnected, address: wallet } = useAccount();
  const { connect, connectors } = useConnect();

  /** Miniapp Ready */
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  /** Load FC User */
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

      // Auto connect special FID
      if (user.fid === SPECIAL_FID && !isConnected) {
        connect({ connector: connectors[0] });
      }
    }

    load();
  }, [isConnected, connect, connectors]);

  /** Join whitelist */
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

  /** NEW: Share after mint */
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

        <img src="/bean.gif" className="bean-img" alt="Kimmi Bean" />

        {/* NORMAL USERS: connect wallet */}
        {!isConnected && fid !== SPECIAL_FID && (
          <button
            className="main-btn"
            onClick={() => connect({ connector: connectors[0] })}
          >
            Connect Wallet
          </button>
        )}

        {/* JOIN WHITELIST */}
        {!isWhitelisted && (
          <button className="main-btn" onClick={joinWhitelist}>
            Join Whitelist
          </button>
        )}

        {/* NORMAL USER WHITELISTED */}
        {isWhitelisted && fid !== SPECIAL_FID && (
          <button className="disabled-btn">Whitelisted ✓</button>
        )}

        {/* SPECIAL USER: CAN MINT */}
        {isWhitelisted && fid === SPECIAL_FID && wallet && (
          <MintButton
            userAddress={wallet}
            fid={fid}
            username={username}
            onMintSuccess={(data) => setMintResult(data)} // ⬅️ CALLBACK
          />
        )}

        {/* SHOW SHARE BUTTON AFTER MINT */}
        {mintResult && (
          <button
            className="main-btn"
            onClick={() =>
              shareToCast(mintResult.id, mintResult.rarity)
            }
          >
            Share to Cast 🚀
          </button>
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