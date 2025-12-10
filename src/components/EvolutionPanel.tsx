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

  // LOCAL STATES
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [beans, setBeans] = useState(0);

  const [feedFee, setFeedFee] = useState<bigint>(0n);
  const [waterFee, setWaterFee] = useState<bigint>(0n);
  const [trainFee, setTrainFee] = useState<bigint>(0n);

  const [loading, setLoading] = useState<"" | "feed" | "water" | "train">("");
  const [toast, setToast] = useState<string | null>(null);


  // ======================================================
  // 1. LOAD USER STATS
  // ======================================================
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

    onStatsUpdate?.(xpNum, beansNum);

  }, [userStatsRaw]);


  // ======================================================
  // 2. READ FEES FROM CONTRACT
  // ======================================================
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


  // ======================================================
  // 3. DO ACTION (FEED / WATER / TRAIN)
  // ======================================================
  function getActionFee(action: "feed" | "water" | "train") {
    if (action === "feed") return feedFee;
    if (action === "water") return waterFee;
    return trainFee;
  }

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
        value: getActionFee(action),
      });

      console.log("Tx submitted:", tx);

      // wait for chain update
      setTimeout(async () => {

        const updated = await refetchStats();
        if (!updated.data) return;

        const stats = updated.data as StatsStruct;

        const newXp = Number(stats.xp);
        const newBeans = Number(stats.beans);

        const xpGain = newXp - xp;
        const beansGain = newBeans - beans;

        // SHOW TOAST
        if (xpGain > 0 || beansGain > 0) {
          setToast(`+${xpGain} XP   +${beansGain} Beans`);
          setTimeout(() => setToast(null), 1800);
        }

        // UPDATE SUPABASE
        await fetch("/api/updateStats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet,
            xp: newXp,
            level: Number(stats.level),
            beans: newBeans,
          }),
        });

        setLoading("");

      }, 2000);

    } catch (err) {
      console.error(err);
      alert("Transaction failed — check fee.");
      setLoading("");
    }
  }


  // ======================================================
  // RENDER UI
  // ======================================================
  return (
    <div className="card bean-panel">
      <div className="title">My Bean</div>
      <div className="subtitle">Care for your Bean to earn BEANS & XP!</div>

      <div className="bean-image-wrap">
        <img src={bean?.image || "/bean.png"} className="bean-image" />
      </div>

      <div className="bean-level">Level {level}</div>

      <div className="xp-bar">
        <div className="xp-fill" style={{ width: `${xp}%` }}></div>
      </div>

      <div className="xp-text">{xp} XP</div>

      <div className="bean-actions">

        <button
          className="bean-btn"
          disabled={loading === "feed"}
          onClick={() => doAction("feed")}
        >
          {loading === "feed" ? "Feeding..." : `🍞 Feed (${Number(feedFee) / 1e18} ETH)`}
        </button>

        <button
          className="bean-btn"
          disabled={loading === "water"}
          onClick={() => doAction("water")}
        >
          {loading === "water" ? "Watering..." : `💧 Water (${Number(waterFee) / 1e18} ETH)`}
        </button>

        <button
          className="bean-btn"
          disabled={loading === "train"}
          onClick={() => doAction("train")}
        >
          {loading === "train" ? "Training..." : `🏋️ Train (${Number(trainFee) / 1e18} ETH)`}
        </button>

      </div>

      {/* TOAST */}
      {toast &&
        createPortal(
          <div className="toast-popup">{toast}</div>,
          document.getElementById("toast-root") as HTMLElement
        )
      }
    </div>
  );
}