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
  onStatsUpdate?: (xp: number, beans: number) => void; // TOTAL XP → header
}

const CONTRACT = import.meta.env.VITE_BEAN_CONTRACT as `0x${string}`;

type StatsStruct = {
  xp: bigint;        // TOTAL XP
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

  // --- STATES ---
  const [xp, setXp] = useState(0);          // TOTAL XP
  const [level, setLevel] = useState(1);
  const [beans, setBeans] = useState(0);

  const [nextReq, setNextReq] = useState(100);

  const [feedFee, setFeedFee] = useState<bigint>(0n);
  const [waterFee, setWaterFee] = useState<bigint>(0n);
  const [trainFee, setTrainFee] = useState<bigint>(0n);

  const [loading, setLoading] = useState<"" | "feed" | "water" | "train">("");
  const [toast, setToast] = useState<string | null>(null);


  // ============================================================
  // LOAD MAIN STATS (XP TOTAL)
  // ============================================================
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

    const totalXpNum = Number(stats.xp);   // TOTAL XP
    const lvlNum = Number(stats.level);
    const beansNum = Number(stats.beans);

    setXp(totalXpNum);
    setLevel(lvlNum);
    setBeans(beansNum);

    // Kirim TOTAL XP ke header (App.tsx)
    onStatsUpdate?.(totalXpNum, beansNum);

  }, [userStatsRaw]);


  // ============================================================
  // GET XP REQUIREMENT
  // ============================================================
  const { data: reqRaw } = useReadContract({
    address: CONTRACT,
    abi: careAbi,
    functionName: "nextLevelRequirement",
    args: [level],
    query: { enabled: Boolean(wallet) }
  });

  useEffect(() => {
    if (reqRaw) setNextReq(Number(reqRaw));
  }, [reqRaw]);


  // ============================================================
  // GET FEES
  // ============================================================
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


  // ============================================================
  // DO ACTION
  // ============================================================
  async function doAction(action: "feed" | "water" | "train") {
    if (!isConnected || !wallet) {
      alert("Connect wallet first");
      return;
    }

    const fee = action === "feed" ? feedFee :
                action === "water" ? waterFee : trainFee;

    try {
      setLoading(action);

      await writeContractAsync({
        address: CONTRACT,
        abi: careAbi,
        functionName: action,
        value: fee,
      });

      // delay to ensure subgraph/node updates
      setTimeout(async () => {
        const updated = await refetchStats();
        if (!updated.data) return;

        const stats = updated.data as StatsStruct;

        const newXp = Number(stats.xp);        // TOTAL XP
        const newBeans = Number(stats.beans);

        const xpGain = newXp - xp;
        const beansGain = newBeans - beans;

        if (xpGain > 0 || beansGain > 0) {
          setToast(`+${xpGain} XP   +${beansGain} Beans`);
          setTimeout(() => setToast(null), 1800);
        }

        // update local
        setXp(newXp);
        setBeans(newBeans);
        setLevel(Number(stats.level));

        // update header
        onStatsUpdate?.(newXp, newBeans);

        setLoading("");

      }, 2500);

    } catch (err) {
      console.error(err);
      alert("Transaction failed — check fee.");
      setLoading("");
    }
  }


  // ============================================================
  // PROGRESS BAR (XP UNTUK LEVEL INI)
  // ============================================================
  const xpForLevel = xp % nextReq;
  const progress = Math.min((xpForLevel / nextReq) * 100, 100);


  // ============================================================
  // UI
  // ============================================================
  return (
    <div className="card bean-panel">

      <div className="title">My Bean</div>
      <div className="subtitle">Care for your Bean to earn BEANS & XP!</div>

      <div className="bean-image-wrap">
        <img src={bean?.image || "/bean.png"} className="bean-image" />
      </div>

      <div className="bean-level">Level {level}</div>

      <div className="xp-bar">
        <div className="xp-fill" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="xp-text">
        {xpForLevel} / {nextReq} XP
      </div>

      <div className="bean-actions">

        <button
          className="bean-btn"
          disabled={loading !== ""}
          onClick={() => doAction("feed")}
        >
          {loading === "feed" ? "Feeding..." : "🍞 Feed"}
        </button>

        <button
          className="bean-btn"
          disabled={loading !== ""}
          onClick={() => doAction("water")}
        >
          {loading === "water" ? "Watering..." : "💧 Water"}
        </button>

        <button
          className="bean-btn"
          disabled={loading !== ""}
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
