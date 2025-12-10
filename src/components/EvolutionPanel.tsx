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
  onStatsUpdate?: (xp: number, beans: number) => void;
}

const CONTRACT = import.meta.env.VITE_BEAN_CONTRACT as `0x${string}`;

// Solidity struct returned by getStats()
type StatsStruct = {
  xp: bigint;
  level: bigint;
  beans: bigint;
  lastAction: bigint;
};

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
  const [actionFee, setActionFee] = useState<bigint>(0n);

  // =====================================================
  // 1. READ USER STATS FROM CONTRACT
  // =====================================================
  const { data: userStatsRaw, refetch: refetchStats } = useReadContract({
    address: CONTRACT,
    abi: careAbi,
    functionName: "getStats",
    args: wallet ? [wallet] : undefined,
    query: { enabled: Boolean(wallet) }
  });

  useEffect(() => {
    if (!userStatsRaw) return;

    const stats = userStatsRaw as StatsStruct;

    const xpNum = Number(stats.xp);
    const levelNum = Number(stats.level);
    const beansNum = Number(stats.beans);

    setXp(xpNum);
    setLevel(levelNum);
    setBeans(beansNum);

    if (onStatsUpdate) onStatsUpdate(xpNum, beansNum);
  }, [userStatsRaw]);


  // =====================================================
  // 2. READ FEE FROM CONTRACT (DYNAMIC)
  // =====================================================
  const { data: feeRaw } = useReadContract({
    address: CONTRACT,
    abi: careAbi,
    functionName: "actionFee",
  });

  useEffect(() => {
    if (feeRaw) setActionFee(feeRaw as bigint);
  }, [feeRaw]);


  // =====================================================
  // 3. DO ACTION → FEED / WATER / TRAIN
  // =====================================================
  async function doAction(action: "feed" | "water" | "train") {
    if (!isConnected || !wallet) {
      alert("Connect wallet first");
      return;
    }

    try {
      console.log("Using contract fee:", actionFee.toString());

      const tx = await writeContractAsync({
        address: CONTRACT,
        abi: careAbi,
        functionName: action,
        value: actionFee,
      });

      console.log("Tx submitted:", tx);

      // Delay for block confirmation
      setTimeout(async () => {
        const updated = await refetchStats();

        if (!updated.data) {
          console.error("Stats returned null:", updated.data);
          return;
        }

        const stats = updated.data as StatsStruct;

        const xpNum = Number(stats.xp);
        const levelNum = Number(stats.level);
        const beansNum = Number(stats.beans);

        // Push to Supabase
        await fetch("/api/updateStats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet,
            xp: xpNum,
            level: levelNum,
            beans: beansNum
          })
        });
      }, 2500);

    } catch (err) {
      console.error("Transaction failed:", err);
      alert("Transaction failed — check gas or fee.");
    }
  }


  // =====================================================
  // RENDER UI
  // =====================================================
  return (
    <div className="card bean-panel">

      <div className="title">My Bean</div>
      <div className="subtitle">Care for your Bean to earn BEANS & XP!</div>

      <div className="bean-image-wrap">
        <img src={bean?.image || "/bean.png"} className="bean-image" />
      </div>

      {/* LEVEL */}
      <div className="bean-level">Level {level}</div>

      {/* XP PROGRESS BAR */}
      <div className="xp-bar">
        <div
          className="xp-fill"
          style={{ width: `${(xp % 100)}%` }}
        ></div>
      </div>

      <div className="xp-text">{xp % 100} / 100 XP</div>

      {/* ACTION BUTTONS */}
      <div className="bean-actions">
        <button className="bean-btn" onClick={() => doAction("feed")}>
          🍞 Feed
        </button>

        <button className="bean-btn" onClick={() => doAction("water")}>
          💧 Water
        </button>

        <button className="bean-btn" onClick={() => doAction("train")}>
          🏋️ Train
        </button>
      </div>

      <div style={{ fontSize: 11, color: "#999", marginTop: 10 }}>
        Action Fee: {Number(actionFee) / 1e18} ETH
      </div>

    </div>
  );
}