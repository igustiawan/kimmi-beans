import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import MintButton from "@components/MintButton";

export default function App() {
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fid, setFid] = useState<number | null>(null);

  const SPECIAL_FID = 299929;

  // READY()
  useEffect(() => {
    async function init() {
      try {
        await sdk.actions.ready();
        console.log("Mini App READY sent!");
      } catch (err) {
        console.error("READY ERROR:", err);
      }
    }
    init();
  }, []);

  // CEK STATUS USER + SIMPAN FID
  useEffect(() => {
    async function check() {
      const ctx = await sdk.context;
      const user = ctx?.user;

      if (!user?.fid) return;

      // simpan fid user sekarang
      setFid(user.fid);

      // cek whitelist
      const res = await fetch(`/api/checkWhitelist?fid=${user.fid}`);
      const json = await res.json();
      
      if (json?.whitelisted) {
        setIsWhitelisted(true);
      }
    }

    check();
  }, []);

  // JOIN WHITELIST
  async function joinWhitelist() {
    setLoading(true);

    try {
      const ctx = await sdk.context;
      const user = ctx?.user;

      if (!user?.fid) {
        setLoading(false);
        return;
      }

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

      if (json.success) {
        setIsWhitelisted(true);
      }
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  }

  // SHARE CAST
  async function shareToCast() {
    const miniAppURL =
      "https://farcaster.xyz/miniapps/VV7PYCDPdD04/kimmi-beans";

    const msg = "I just joined the Kimmi Beans whitelist! 🫘✨";

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

        {/* ============================
            TOMBOL JOIN WHITELIST
        ============================ */}
        <button
          className={`main-btn ${isWhitelisted ? "disabled" : ""}`}
          disabled={isWhitelisted}
          onClick={joinWhitelist}
        >
          {isWhitelisted ? "Whitelisted ✓" : "Join Whitelist"}
        </button>

        {/* ============================
            TOMBOL MINT — KHUSUS FID 299929
        ============================ */}
        {isWhitelisted && fid === SPECIAL_FID && (
          <MintButton
            onMintComplete={(data) => {
              console.log("Mint Result:", data);
              alert(`Mint success! You got ${data.rarity}!`);
            }}
          />
        )}

        {/* ============================
            TOMBOL SHARE CAST1
        ============================ */}
        {isWhitelisted && (
          <button className="share-btn" onClick={shareToCast}>
            Share to Cast
          </button>
        )}
      </div>
    </div>
  );
}