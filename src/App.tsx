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

  async function shareToCast() {
    const embedUrl = "https://xkimmi.fun/share";

  await sdk.actions.openUrl({
    url:
      "https://warpcast.com/~/compose?" +
      `text=${encodeURIComponent("I just joined the Kimmi Beans whitelist! 🫘")}` +
      `&embeds[]=${encodeURIComponent("https://xkimmi.fun/share")}`
  });
  }

  return (
    <div className="container">
      <div className="card">
        <div className="title">Kimmi Beans</div>
        <div className="subtitle">Mint cute, unique beans every day!</div>

        <img src="/bean.gif" className="bean-img" alt="Kimmi Bean" />

        <button
          className={`main-btn ${isWhitelisted ? "disabled" : ""}`}
          disabled={isWhitelisted}
          onClick={joinWhitelist}
        >
          {isWhitelisted ? "Whitelisted ✓" : "Join Whitelist"}
        </button>

        {isWhitelisted && (
          <button className="share-btn" onClick={shareToCast}>
            Share to Cast
          </button>
        )}
      </div>
    </div>
  );
}
