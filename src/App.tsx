import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

export default function App() {
  const [isWhitelisted, setIsWhitelisted] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        await sdk.actions.ready();

        // === CEK STATUS WHITELIST ===
        const ctx = await sdk.context;
        const fid = ctx?.user?.fid;

        if (fid) {
          const res = await fetch(`/api/checkWhitelist?fid=${fid}`);
          const json = await res.json();
          setIsWhitelisted(json.whitelisted || false);
        }

      } catch (err) {
        console.error("READY ERROR:", err);
      }
    }
    init();
  }, []);

  // === JOIN WHITELIST ===
  async function joinWhitelist() {
    try {
      const ctx = await sdk.context;
      const user = ctx?.user;
      if (!user?.fid) return;

      const res = await fetch("/api/joinWhitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
  }

  return (
    <div className="container">
      <div className="card">

        <div className="title">Kimmi Beans</div>
        <div className="subtitle">Mint cute, unique beans every day!</div>

        <img src="/icon.png" className="bean-img" alt="Kimmi Bean" />

        <button
          className={`main-btn ${isWhitelisted ? "disabled" : ""}`}
          onClick={joinWhitelist}
          disabled={isWhitelisted}
        >
          {isWhitelisted ? "Whitelisted ✓" : "Join Whitelist"}
        </button>

        {isWhitelisted && (
          <div className="note">You're whitelisted! 🎉</div>
        )}
      </div>
    </div>
  );
}
