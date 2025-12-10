import React, { useEffect, useState } from "react";
import { useWriteContract, useReadContract } from "wagmi";
import careAbi from "../abi/kimmiBeansCare.json";

interface Props {
  wallet: string | undefined;
  isConnected: boolean;
  bean: {
    id: number;
    rarity: string;
    image: string;
  } | null;
  onStatsUpdate?: (xp: number, beans: number) => void; // <-- ADD THIS
}

const CONTRACT = import.meta.env.VITE_BEAN_CONTRACT as `0x${string}`;
const ACTION_FEE = BigInt(import.meta.env.VITE_ACTION_FEE);

export default function EvolutionPanel({
  bean,
  wallet,
  isConnected,
  onStatsUpdate
}: Props) {

  const { writeContractAsync } = useWriteContract();

  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [beans, setBeans] = useState(0);

  // -------------------------
  // LOAD USER STATS FROM CONTRACT
  // -------------------------
  const { data: userStats, refetch } = useReadContract({
    address: CONTRACT,
    abi: careAbi,
    functionName: "getStats",
    args: wallet ? [wallet] : undefined,
    query: {
      enabled: Boolean(wallet),
    }
  });

useEffect(() => {
  if (!userStats || !Array.isArray(userStats)) return;

  const [xpRaw, levelRaw, beansRaw] = userStats;
  const xpNum = Number(xpRaw);
  const levelNum = Number(levelRaw);
  const beansNum = Number(beansRaw);

  setXp(xpNum);
  setLevel(levelNum);
  setBeans(beansNum);

  if (onStatsUpdate) onStatsUpdate(xpNum, beansNum);

}, [userStats]);


  // -------------------------
  // CALL FEED / WATER / TRAIN
  // -------------------------
  async function doAction(action: "feed" | "water" | "train") {
    if (!isConnected || !wallet) {
      alert("Connect wallet first");
      return;
    }

    try {
      const tx = await writeContractAsync({
        address: CONTRACT,
        abi: careAbi,
        functionName: action,
        value: ACTION_FEE,
      });

      console.log("Tx sent:", tx);

      // Auto refresh stats after tx confirmation delay
        setTimeout(async () => {
        const updated = await refetch();

        if (!updated.data || !Array.isArray(updated.data)) {
            console.warn("Invalid stats returned:", updated.data);
            return;
        }

        const [xpRaw, levelRaw, beansRaw] = updated.data as [bigint, bigint, bigint];

        await fetch("/api/updateStats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                wallet,
                xp: Number(xpRaw),
                level: Number(levelRaw),
                beans: Number(beansRaw)
            })
        });
        }, 3000);

    } catch (err) {
      console.error("Transaction failed:", err);
      alert("Transaction failed — check gas or fee.");
    }
  }

  return (
    <div className="card bean-panel">

      <div className="title">My Bean</div>
      <div className="subtitle">Care for your Bean to earn BEANS & XP!</div>

      <div className="bean-image-wrap">
        <img src={bean?.image || "/bean.png"} className="bean-image" />
      </div>

      {/* LEVEL */}
      <div className="bean-level">Level {level}</div>

      {/* XP BAR */}
      <div className="xp-bar">
        <div
          className="xp-fill"
          style={{ width: `${(xp % 100)}%` }}
        ></div>
      </div>

      <div className="xp-text">{xp % 100} / 100 XP</div>

      {/* ACTION BUTTONS */}
      <div className="bean-actions">
        <button className="bean-btn" onClick={() => doAction("feed")}>🍞 Feed</button>
        <button className="bean-btn" onClick={() => doAction("water")}>💧 Water</button>
        <button className="bean-btn" onClick={() => doAction("train")}>🏋️ Train</button>
      </div>
    </div>
  );
}