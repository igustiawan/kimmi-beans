import { useEffect } from "react";
import "./App.css";

export default function App() {
  // Mini App Ready()
  const sendReady = () => {
    try {
      if (window.farcaster?.actions?.ready) {
        window.farcaster.actions.ready();
        console.log("Mini App READY sent ✔");
        return true;
      }
    } catch (err) {
      console.log("ready() error:", err);
    }
    return false;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (sendReady()) clearInterval(interval);
    }, 120);
  }, []);

  const mintBean = () => {
    alert("Minting coming soon!");
  };

  return (
    <div className="container">
      <div className="card">
        <div className="title">Kimmi Beans</div>
        <div className="subtitle">Mint cute, unique beans every day!</div>

        <img
          src="https://xkimmi.fun/icon.png"
          className="bean-img"
          alt="Kimmi Bean"
        />

        <button className="mint-btn" onClick={mintBean}>
          Mint Bean
        </button>
      </div>
    </div>
  );
}
