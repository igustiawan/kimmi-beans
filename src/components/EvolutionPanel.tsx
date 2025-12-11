import React, { useEffect, useState } from "react";
import { useWriteContract, useReadContract } from "wagmi";
import careAbi from "../abi/kimmiBeansCare.json";
import { createPortal } from "react-dom";

interface Props {
  wallet: string | undefined;
  isConnected: boolean;
  bean: { id: number; rarity: string; image: string } | null;
  fid: number | null;
  username: string | null;
  onStatsUpdate?: (xp: number, beans: number) => void;
  canInteract?: boolean; // <-- added prop
}

const CONTRACT = import.meta.env.VITE_BEAN_CONTRACT as `0x${string}`;

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
  fid,
  username,
  onStatsUpdate,
  canInteract = true, // default true for backwards compatibility
}: Props) {
  const { writeContractAsync } = useWriteContract();

  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [beans, setBeans] = useState(0);

  // XP requirement (dinamis)
  const [nextReq, setNextReq] = useState(100);

  // Fees
  const [feedFee, setFeedFee] = useState<bigint>(0n);
  const [waterFee, setWaterFee] = useState<bigint>(0n);
  const [trainFee, setTrainFee] = useState<bigint>(0n);

  // UI state
  const [loading, setLoading] = useState<"" | "feed" | "water" | "train">("");
  const [toast, setToast] = useState<string | null>(null);

  // ---------------------------------------------------------------
  // LOAD STATS
  // ---------------------------------------------------------------
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
    const lvlNum = Number(stats.level);
    const beansNum = Number(stats.beans);

    setXp(xpNum);
    setLevel(lvlNum);
    setBeans(beansNum);

    onStatsUpdate?.(xpNum, beansNum);
  }, [userStatsRaw, onStatsUpdate]);

  // ---------------------------------------------------------------
  // LOAD XP REQUIREMENT FOR NEXT LEVEL
  // ---------------------------------------------------------------
  const { data: nextReqRaw } = useReadContract({
    address: CONTRACT,
    abi: careAbi,
    functionName: "nextLevelRequirement",
    args: [level],
    query: { enabled: Boolean(wallet) },
  });

  useEffect(() => {
    if (nextReqRaw) setNextReq(Number(nextReqRaw));
  }, [nextReqRaw]);

  // ---------------------------------------------------------------
  // LOAD FEES
  // ---------------------------------------------------------------
  const { data: feedFeeRaw } = useReadContract({
    address: CONTRACT,
    abi: careAbi,
    functionName: "feedFee",
  });

  const { data: waterFeeRaw } = useReadContract({
    address: CONTRACT,
    abi: careAbi,
    functionName: "waterFee",
  });

  const { data: trainFeeRaw } = useReadContract({
    address: CONTRACT,
    abi: careAbi,
    functionName: "trainFee",
  });

  useEffect(() => {
    if (feedFeeRaw) setFeedFee(feedFeeRaw as bigint);
    if (waterFeeRaw) setWaterFee(waterFeeRaw as bigint);
    if (trainFeeRaw) setTrainFee(trainFeeRaw as bigint);
  }, [feedFeeRaw, waterFeeRaw, trainFeeRaw]);

  // ---------------------------------------------------------------
  // DO ACTION
  // ---------------------------------------------------------------
  async function doAction(action: "feed" | "water" | "train") {
    if (!isConnected || !wallet) {
      alert("Connect wallet first");
      return;
    }

    // block if gating disabled
    if (!canInteract) {
      setToast("Share & Unlock dulu untuk membuka aksi harian.");
      setTimeout(() => setToast(null), 1600);
      return;
    }

    const fee =
      action === "feed" ? feedFee : action === "water" ? waterFee : trainFee;

    try {
      setLoading(action);

      const tx = await writeContractAsync({
        address: CONTRACT,
        abi: careAbi,
        functionName: action,
        value: fee,
      });

      console.log("Tx sent:", tx);

      // wait a bit then refetch on-chain stats (you may replace with tx.wait)
      setTimeout(async () => {
        const updated = await refetchStats();
        if (!updated || !updated.data) {
          setLoading("");
          return;
        }

        const stats = updated.data as StatsStruct;

        const newXp = Number(stats.xp);
        const newBeans = Number(stats.beans);

        const xpGain = newXp - xp;
        const beansGain = newBeans - beans;

        if (xpGain > 0 || beansGain > 0) {
          setToast(`+${xpGain} XP   +${beansGain} Beans`);
          setTimeout(() => setToast(null), 1800);
        }

        // Sync ke Supabase (mirror)
        try {
          await fetch("/api/updateStats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              wallet,
              fid,
              username,
              xp: newXp,
              level: Number(stats.level),
              beans: newBeans,
            }),
          });
        } catch (err) {
          console.warn("Failed to sync to supabase", err);
        }

        setLoading("");
      }, 2500);
    } catch (err) {
      console.error(err);
      alert("Transaction failed — check fee.");
      setLoading("");
    }
  }

  // ---------------------------------------------------------------
  // PROGRESS BAR PROPERLY USING CONTRACT REQUIREMENT
  // ---------------------------------------------------------------
  const progress = Math.min((xp / nextReq) * 100, 100);

  return (
    <div className="card bean-panel">
      <div className="title">My Bean</div>
      <div className="subtitle">Care for your Bean to earn BEANS & XP!</div>

      <div className="bean-image-wrap">
        <img src={bean?.image || "/bean.png"} className="bean-image" alt="bean" />
      </div>

      <div className="bean-level">Level {level}</div>

      <div className="xp-bar">
        <div className="xp-fill" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="xp-text">{xp} / {nextReq} XP</div>

      {/* If user cannot interact, show hint message */}
      {!canInteract && (
        <div style={{ marginTop: 10, padding: "8px 12px", background: "#fff7ed", borderRadius: 8, color: "#6b4a00", fontSize: 13 }}>
          Bagikan progresmu dulu untuk membuka tombol Feed / Water / Train.
        </div>
      )}

      <div className="bean-actions" style={{ marginTop: 12 }}>
        {/* Semua button disable saat loading atau kalau canInteract === false */}
        <button
          className="bean-btn"
          disabled={loading !== "" || !canInteract}
          onClick={() => doAction("feed")}
        >
          {loading === "feed" ? "Feeding..." : "🍞 Feed"}
        </button>

        <button
          className="bean-btn"
          disabled={loading !== "" || !canInteract}
          onClick={() => doAction("water")}
        >
          {loading === "water" ? "Watering..." : "💧 Water"}
        </button>

        <button
          className="bean-btn"
          disabled={loading !== "" || !canInteract}
          onClick={() => doAction("train")}
        >
          {loading === "train" ? "Training..." : "🏋️ Train"}
        </button>
      </div>

      {toast &&
        createPortal(
          <div className="toast-popup">{toast}</div>,
          document.getElementById("toast-root") as HTMLElement
        )}
    </div>
  );
}
