import React, { useEffect, useState } from "react";
import { useWriteContract, useReadContract } from "wagmi";
import careAbi from "../abi/kimmiBeansCare.json";
import { createPortal } from "react-dom";

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

  // TOTAL XP
  const [totalXp, setTotalXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [beans, setBeans] = useState(0);

  // XP breakdown
  const [nextReq, setNextReq] = useState(100);
  const [prevReq, setPrevReq] = useState(0);
  const [progressXp, setProgressXp] = useState(0);

  // Fees
  const [feedFee, setFeedFee] = useState<bigint>(0n);
  const [waterFee, setWaterFee] = useState<bigint>(0n);
  const [trainFee, setTrainFee] = useState<bigint>(0n);

  // UI
  const [loading, setLoading] = useState<"" | "feed" | "water" | "train">("");
  const [toast, setToast] = useState<string | null>(null);

  // ============================================================
  // GET TOTAL XP + LEVEL + BEANS
  // ============================================================
  const { data: rawStats, refetch: refetchStats } = useReadContract({
    address: CONTRACT,
    abi: careAbi,
    functionName: "getStats",
    args: wallet ? [wallet] : undefined,
    query: { enabled: Boolean(wallet) }
  });

  useEffect(() => {
    if (!rawStats) return;

    const stats = rawStats as StatsStruct;

    const tXp = Number(stats.xp);
    const lvl = Number(stats.level);
    const b = Number(stats.beans);

    setTotalXp(tXp);
    setLevel(lvl);
    setBeans(b);

    // SEND TOTAL XP TO HEADER
    onStatsUpdate?.(tXp, b);
  }, [rawStats]);

  // ============================================================
  // XP REQUIREMENT
  // ============================================================
  const { data: nextReqRaw } = useReadContract({
    address: CONTRACT,
    abi: careAbi,
    functionName: "nextLevelRequirement",
    args: [level],
  });

  const { data: prevReqRaw } = useReadContract({
    address: CONTRACT,
    abi: careAbi,
    functionName: "nextLevelRequirement",
    args: [Math.max(level - 1, 0)],
  });

  useEffect(() => {
    if (nextReqRaw) setNextReq(Number(nextReqRaw));
    if (prevReqRaw) setPrevReq(Number(prevReqRaw));
  }, [nextReqRaw, prevReqRaw]);

  useEffect(() => {
    // Hitung XP untuk level berjalan
    const base = prevReq;
    const prog = Math.max(0, totalXp - base);

    setProgressXp(prog);
  }, [totalXp, prevReq, nextReq]);

  // ============================================================
  // LOAD FEES
  // ============================================================
  const { data: feedFeeRaw } = useReadContract({ address: CONTRACT, abi: careAbi, functionName: "feedFee" });
  const { data: waterFeeRaw } = useReadContract({ address: CONTRACT, abi: careAbi, functionName: "waterFee" });
  const { data: trainFeeRaw } = useReadContract({ address: CONTRACT, abi: careAbi, functionName: "trainFee" });

  useEffect(() => {
    if (feedFeeRaw) setFeedFee(feedFeeRaw as bigint);
    if (waterFeeRaw) setWaterFee(waterFeeRaw as bigint);
    if (trainFeeRaw) setTrainFee(trainFeeRaw as bigint);
  }, [feedFeeRaw, waterFeeRaw, trainFeeRaw]);

  // ============================================================
  // DO ACTION
  // ============================================================
  async function doAction(action: "feed" | "water" | "train") {
    if (!isConnected || !wallet) {
      alert("Connect wallet first");
      return;
    }

    const fee =
      action === "feed" ? feedFee :
      action === "water" ? waterFee : trainFee;

    try {
      setLoading(action);

      const tx = await writeContractAsync({
        address: CONTRACT,
        abi: careAbi,
        functionName: action,
        value: fee,
      });

      console.log("Tx sent:", tx);

      setTimeout(async () => {
        const updated = await refetchStats();
        if (!updated.data) return;

        const stats = updated.data as StatsStruct;

        const newXp = Number(stats.xp);
        const newBeans = Number(stats.beans);

        const xpGain = newXp - totalXp;
        const beansGain = newBeans - beans;

        if (xpGain > 0 || beansGain > 0) {
          setToast(`+${xpGain} XP   +${beansGain} Beans`);
          setTimeout(() => setToast(null), 1800);
        }

        await fetch("/api/updateStats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet,
            xp: newXp,
            level: Number(stats.level),
            beans: newBeans
          })
        });

        setLoading("");

      }, 2500);
    } catch (err) {
      console.error(err);
      alert("Transaction failed — check fee.");
      setLoading("");
    }
  }

  // ============================================================
  // RENDER
  // ============================================================
  const progressPct = Math.min((progressXp / (nextReq - prevReq)) * 100, 100);

  return (
    <div className="card bean-panel">

      <div className="title">My Bean</div>
      <div className="subtitle">Care for your Bean to earn BEANS & XP!</div>

      <div className="bean-image-wrap">
        <img src={bean?.image || "/bean.png"} className="bean-image" />
      </div>

      <div className="bean-level">Level {level}</div>

      <div className="xp-bar">
        <div className="xp-fill" style={{ width: `${progressPct}%` }}></div>
      </div>

      <div className="xp-text">
        {progressXp} / {nextReq - prevReq} XP
      </div>

      <div className="bean-actions">
        <button className="bean-btn" disabled={loading !== ""} onClick={() => doAction("feed")}>
          {loading === "feed" ? "Feeding..." : "🍞 Feed"}
        </button>

        <button className="bean-btn" disabled={loading !== ""} onClick={() => doAction("water")}>
          {loading === "water" ? "Watering..." : "💧 Water"}
        </button>

        <button className="bean-btn" disabled={loading !== ""} onClick={() => doAction("train")}>
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
