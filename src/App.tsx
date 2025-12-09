import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import MintButton from "@components/MintButton";
import { useAccount, useConnect } from "wagmi";

export default function App() {
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [fid, setFid] = useState<number | null>(null);

  const SPECIAL_FID = 299929;

  const { isConnected, address: wallet } = useAccount();
  const { connect, connectors } = useConnect();

  // READY
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  // Load user data
  useEffect(() => {
    async function load() {
      const ctx = await sdk.context;
      const user = ctx?.user;

      if (!user?.fid) return;
      setFid(user.fid);

      const res = await fetch(`/api/checkWhitelist?fid=${user.fid}`);
      const json = await res.json();
      if (json.whitelisted) setIsWhitelisted(true);
    }

    load();
  }, []);

  // 🔥 AUTO CONNECT hanya FID tertentu
  useEffect(() => {
    if (!fid) return;

    if (fid === SPECIAL_FID && !isConnected) {
      connect({ connector: connectors[0] });
    }
  }, [fid]);

  // Join whitelist
  async function joinWhitelist() {
    if (!fid) return;

    const ctx = await sdk.context;
    const user = ctx?.user;
    if (!user?.fid) return;

    const res = await fetch("/api/joinWhitelist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "fc-request-signature": "verified"
      },
      body: JSON.stringify({
        fid: user.fid,
        username: user.username
      })
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

        {/* Connect wallet (TAMPIL kalau bukan FID spesial) */}
        {!isConnected && fid !== SPECIAL_FID && (
          <button className="main-btn" onClick={() => connect({ connector: connectors[0] })}>
            Connect Wallet
          </button>
        )}

        {/* Join whitelist */}
        {!isWhitelisted && isConnected && (
          <button className="main-btn" onClick={joinWhitelist}>
            Join Whitelist
          </button>
        )}

        {/* Mint NFT KHUSUS FID 299929 */}
        {isWhitelisted && fid === SPECIAL_FID && wallet && (
          <MintButton
            userAddress={wallet}
            onMintComplete={(data) => {
              alert(`Mint success! Rarity: ${data.rarity}`);
            }}
          />
        )}

        {/* Wallet display */}
        {isConnected && wallet && (
          <div className="wallet-display">
            Wallet: {wallet.slice(0, 6)}...{wallet.slice(-4)}
          </div>
        )}

      </div>
    </div>
  );
}