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

  function joinWhitelist() {
    alert("Whitelist registration opening soon!");
  }

  return (
    <div className="container">
      <div className="card">
        <div className="title">Kimmi Beans 🫘🫘</div>
        <div className="subtitle">Mint cute, unique beans every day!</div>

        <img src="/icon.png" className="bean-img" alt="Kimmi Bean" />

        <button className="main-btn" onClick={joinWhitelist}>
          Join Whitelist
        </button>
      </div>
    </div>
  );
}
