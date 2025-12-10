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

// Sesuai struct Solidity
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

  // State asli
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [beans, setBeans] = useState(0);
  const [actionFee, setActionFee] = useState<bigint>(0n);

  // State tambahan baru (tidak ganggu logic)
  const [loading, setLoading] = useState<"" | "feed" | "water" | "train">("");
  const [toast, setToast] = useState<string | null>(null);

  // =====================================================
  // 1. READ USER STATS — versi kamu (VALID)
  // =====================================================
  const { data: userStatsRaw, refetch: refetchStats } = useReadContract({
    address: CONTRACT,
    abi: careAbi,
    functionName: "getStats",
    args: wallet ? [wallet] : undefined,
    query: { enabled: Boolean(wallet) },
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
  // 2. READ ACTION_FEE — versi kamu (VALID)
  // =====================================================
  const { data: feeRaw } = useReadContract({
    address: CONTRACT,
    abi: careAbi,
    functionName: "ACTION_FEE"
  });

  useEffect(() => {
    if (feeRaw) setActionFee(feeRaw as bigint);
  }, [feeRaw]);


  // =====================================================
  // 3. ACTION (FEED/WATER/TRAIN) — versi kamu + toast fix
  // =====================================================
  async function doAction(action: "feed" | "water" | "train") {
    if (!isConnected || !wallet) {
      alert("Connect wallet first");
      return;
    }

    try {
      setLoading(action);

      const tx = await writeContractAsync({
        address: CONTRACT,
        abi: careAbi,
        functionName: action,
        value: actionFee,
      });

      console.log("Tx submitted:", tx);

      setTimeout(async () => {
        const updated = await refetchStats();

        if (!updated.data) {
          console.error("Stats returned null", updated.data);
          setLoading("");
          return;
        }

        const stats = updated.data as StatsStruct;

        const newXp = Number(stats.xp);
        const newLevel = Number(stats.level);
        const newBeans = Number(stats.beans);

        // Hitung gain
        const xpGain = newXp - xp;
        const beansGain = newBeans - beans;

        // Munculkan toast jika ada perbedaan
        if (xpGain > 0 || beansGain > 0) {
          setToast(`+${xpGain} XP   +${beansGain} Beans`);
          setTimeout(() => setToast(null), 1800);
        }

        // Push ke Supabase (kode kamu)
        await fetch("/api/updateStats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet,
            xp: newXp,
            level: newLevel,
            beans: newBeans
          })
        });

        setLoading("");

      }, 2200);

    } catch (err) {
      console.error("Transaction failed:", err);
      alert("Transaction failed — check gas or fee.");
      setLoading("");
    }
  }

  return (
    <div className="card bean-panel">

      <div className="title">My Bean</div>
      <div className="subtitle">Care for your Bean to earn BEANS & XP!</div>

      <div className="bean-image-wrap">
        <img src={bean?.image || "/bean.png"} className="bean-image" />
      </div>

      <div className="bean-level">Level {level}</div>

      {/* XP BAR */}
      <div className="xp-bar">
        <div className="xp-fill" style={{ width: `${(xp % 100)}%` }}></div>
      </div>

      <div className="xp-text">{xp % 100} / 100 XP</div>

      {/* ACTION BUTTONS */}
      <div className="bean-actions">

        <button
          className="bean-btn"
          disabled={loading === "feed"}
          onClick={() => doAction("feed")}
        >
          {loading === "feed" ? "Feeding..." : "🍞 Feed"}
        </button>

        <button
          className="bean-btn"
          disabled={loading === "water"}
          onClick={() => doAction("water")}
        >
          {loading === "water" ? "Watering..." : "💧 Water"}
        </button>

        <button
          className="bean-btn"
          disabled={loading === "train"}
          onClick={() => doAction("train")}
        >
          {loading === "train" ? "Training..." : "🏋️ Train"}
        </button>

      </div>

      {/* TOAST */}
      {toast && (
        <div
          style={{
            marginTop: 12,
            padding: "7px 12px",
            background: "#2ecc71",
            borderRadius: 10,
            fontSize: 13,
            color: "white",
            textAlign: "center",
            animation: "fadeIn 0.25s"
          }}
        >
          {toast}
        </div>
      )}

      <div style={{ fontSize: 11, color: "#999", marginTop: 10 }}>
        Action Fee: {Number(actionFee) / 1e18} ETH
      </div>

    </div>
  );
}
