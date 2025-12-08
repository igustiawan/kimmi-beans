import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

export default function App() {
  // FARCASTER READY()
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

  function mintBean() {
    alert("Minting coming soon!");
  }

  return (
    <div className="container">
      <div className="card">
        <div className="title">Kimmi Beans 🫘🫘</div>
        <div className="subtitle">Mint cute, unique beans every day!</div>

        <img src="/icon.png" className="bean-img" alt="Kimmi Bean" />

        <button className="mint-btn" onClick={mintBean}>
          Mint Bean
        </button>
      </div>
    </div>
  );
}
