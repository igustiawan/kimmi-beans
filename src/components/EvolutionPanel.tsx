import React, { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import beanABI from "../abi/beanActions.json";

interface Props {
  wallet: string | undefined;
  isConnected: boolean;
  bean: {
    id: number;
    rarity: string;
    image: string;
  } | null;
}

export default function EvolutionPanel({ wallet, isConnected, bean }: Props) {

  const CONTRACT = import.meta.env.VITE_BEAN_CONTRACT;
  const ACTION_FEE = 0.0000003; // ~0.001 USD Base

  const { writeContractAsync } = useWriteContract();

  const [xp, setXp] = useState(30);
  const [beansEarned, setBeansEarned] = useState(0);
  const maxXp = 100;

  async function sendAction(action: "feed" | "water" | "train") {
    if (!isConnected || !wallet) {
      alert("Connect wallet first");
      return;
    }

    try {
      const tx = await writeContractAsync({
        address: CONTRACT as `0x${string}`,
        abi: beanABI,
        functionName: action,
        value: BigInt(ACTION_FEE * 1e18), // Convert to wei
      });

      console.log("TX:", tx);

      // random local UX response (UI langsung update)
      const gainXp = Math.floor(Math.random() * 20) + 10;
      const gainBeans = Math.floor(Math.random() * 5) + 1;

      setXp((prev) => prev + gainXp);
      setBeansEarned((prev) => prev + gainBeans);

      alert(`+${gainXp} XP, +${gainBeans} Beans 🎉`);

    } catch (err) {
      console.error(err);
      alert("Transaction failed.");
    }
  }

  return (
    <div className="card bean-panel">

      <div className="title">My Bean</div>
      <div className="subtitle">Care for your Bean to earn BEANS & XP!</div>

      <div className="bean-image-wrap">
        <img
          src={bean?.image || "/bean.png"}
          className="bean-image"
          alt="Bean Evolution"
        />
      </div>

      {/* XP */}
      <div className="bean-level">Level 1</div>

      <div className="xp-bar">
        <div className="xp-fill" style={{ width: `${(xp / maxXp) * 100}%` }} />
      </div>
      <div className="xp-text">{xp} / {maxXp} XP</div>

      {/* ACTION BUTTONS */}
      <div className="bean-actions">

        <button className="bean-btn" onClick={() => sendAction("feed")}>
          🍞 Feed
        </button>

        <button className="bean-btn" onClick={() => sendAction("water")}>
          💧 Water
        </button>

        <button className="bean-btn" onClick={() => sendAction("train")}>
          🏋️ Train
        </button>

      </div>

    </div>
  );
}