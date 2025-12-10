import React, { useEffect, useState } from "react";
import { useWriteContract, useAccount } from "wagmi";
import careAbi from "../abi/care.json";

// ENV untuk Vite
const CARE_CONTRACT = import.meta.env.VITE_CARE_CONTRACT!;
const ACTION_FEE = BigInt(import.meta.env.VITE_CARE_FEE!);

interface Props {
  bean: {
    id: number;
    rarity: string;
    image: string;
  } | null;
}

export default function EvolutionPanel({ bean }: Props) {
  const { address: wallet } = useAccount();

  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [beans, setBeans] = useState(0);

  const maxXp = (level + 1) * 100;

  const { writeContractAsync } = useWriteContract();

  // Load stats from contract via API
  async function loadStats() {
    if (!wallet) return;

    try {
      const res = await fetch(`/api/getStats?wallet=${wallet}`);
      const data = await res.json();

      if (data) {
        setXp(Number(data.xp));
        setBeans(Number(data.beans));
        setLevel(Number(data.level));
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadStats();
    const t = setInterval(loadStats, 4000);
    return () => clearInterval(t);
  }, [wallet]);

  async function doAction(action: "feed" | "water" | "train") {
    try {
      await writeContractAsync({
        address: CARE_CONTRACT,
        abi: careAbi,
        functionName: action,
        value: ACTION_FEE,
      });

      setTimeout(loadStats, 1200);
    } catch (err) {
      console.error(err);
      alert("Transaction failed");
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

      <div className="bean-level">Level {level}</div>

      <div className="xp-bar">
        <div className="xp-fill" style={{ width: `${(xp / maxXp) * 100}%` }}></div>
      </div>

      <div className="xp-text">{xp} / {maxXp} XP</div>

      <div className="bean-points">🫘 {beans} Beans</div>

      <div className="bean-actions">
        <button className="bean-btn" onClick={() => doAction("feed")}>🍞 Feed</button>
        <button className="bean-btn" onClick={() => doAction("water")}>💧 Water</button>
        <button className="bean-btn" onClick={() => doAction("train")}>🏋️ Train</button>
      </div>
    </div>
  );
}