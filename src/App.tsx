import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

export default function App() {
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [loading, setLoading] = useState(false);

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

  // CEK STATUS USER
  useEffect(() => {
    async function check() {
      const ctx = await sdk.context;
      const user = ctx?.user;
      if (!user?.fid) return;

      const res = await fetch(`/api/checkWhitelist?fid=${user.fid}`);
      const json = await res.json();
      if (json?.whitelisted) setIsWhitelisted(true);
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
        setIsWhitelisted(true);   // <-- PENTING!
      }
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  }

  return (
    <div className="container">
      <div className="card">

        <div className="title">Kimmi Beans</div>
        <div className="subtitle">Mint cute, unique beans every day!</div>

        <img src="/icon.png" className="bean-img" />

        <button
          className="main-btn"
          disabled={loading || isWhitelisted}
          onClick={joinWhitelist}
        >
          {loading
            ? "Processing..."
            : isWhitelisted
            ? "Whitelisted ✓"
            : "Join Whitelist"}
        </button>

      </div>
    </div>
  );
}
