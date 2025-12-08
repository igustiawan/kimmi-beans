import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

export default function App() {
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

  // === JOIN WHITELIST ===
  async function joinWhitelist() {
    try {
      const ctx = await sdk.context;
      const user = ctx?.user;

      if (!user?.fid) {
        alert("Unable to get user info. Please reopen the mini app.");
        return;
      }

      const res = await fetch("/api/joinWhitelist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "fc-request-signature": "verified"
        },
        body: JSON.stringify({
          fid: user.fid,
          username: user.username,
        }),
      });

      const json = await res.json();

      if (json.success) {
        alert("You're whitelisted! 🎉");
      } else {
        alert("Error: " + json.error);
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    }
  }

  return (
    <div className="container">
      <div className="card">
        <div className="title">Kimmi Beans</div>
        <div className="subtitle">Mint cute, unique beans every day!</div>

        <img src="/icon.png" className="bean-img" alt="Kimmi Bean" />

        <button className="main-btn" onClick={joinWhitelist}>
          Join Whitelist
        </button>
      </div>
    </div>
  );
}
