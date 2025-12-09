import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import MintButton from "@components/MintButton";
import { useAccount, useConnect } from "wagmi";

export default function App() {
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [fid, setFid] = useState<number | null>(null);
  const [fcUser, setFcUser] = useState<any>(null);

  const SPECIAL_FID = 299929;

  // Wagmi hooks
  const { isConnected, address: wallet } = useAccount();
  const { connect, connectors } = useConnect();

  // === READY ===
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  // === Load Farcaster Context ===
  useEffect(() => {
    async function load() {
      const ctx = await sdk.context;
      const user = ctx?.user;

      if (!user?.fid) return;

      setFid(user.fid);
      setFcUser(user); // ← SIMPAN USERNAME + FID SEKALIGUS

      // cek whitelist
      const res = await fetch(`/api/checkWhitelist?fid=${user.fid}`);
      const json = await res.json();

      if (json.whitelisted) setIsWhitelisted(true);

      // AUTO CONNECT → hanya untuk SPECIAL_FID
      if (user.fid === SPECIAL_FID && !isConnected) {
        connect({ connector: connectors[0] });
      }
    }

    load();
  }, [connect, connectors, isConnected]);

  // === Join Whitelist ===
  async function joinWhitelist() {
    if (!fid || !fcUser) return;

    const res = await fetch("/api/joinWhitelist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "fc-request-signature": "verified",
      },
      body: JSON.stringify({
        fid: fcUser.fid,
        username: fcUser.username,
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

        {/* === USER NORMAL yang sudah WL === */}
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

        {/* === SPECIAL USER (299929) — hanya dia yang boleh mint === */}
        {isWhitelisted && fid === SPECIAL_FID && wallet && fcUser && (
          <MintButton
            userAddress={wallet}
            fid={fcUser.fid}
            username={fcUser.username}
          />
        )}

        {/* === Wallet Display === */}
        {isConnected && wallet && (
          <div className="wallet-display">
            Wallet: {wallet.slice(0, 6)}...{wallet.slice(-4)}
          </div>
        )}
      </div>
    </div>
  );
}