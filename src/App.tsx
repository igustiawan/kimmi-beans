import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import MintButton from "./components/MintButton";
import { useAccount, useConnect } from "wagmi";

export default function App() {
  const SPECIAL_FID = 299929;

  const [fid, setFid] = useState<number | null>(null);
  const [username, setUsername] = useState<string>("");
  const [isWhitelisted, setIsWhitelisted] = useState(false);

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

      // Auto connect ONLY special user
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
          />
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
