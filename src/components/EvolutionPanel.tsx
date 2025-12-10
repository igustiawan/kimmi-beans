import React, { useEffect, useState } from "react";
import { useWriteContract, useReadContract } from "wagmi";
import { createPortal } from "react-dom";
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

  // 3 fee berbeda
  const [feeFeed, setFeeFeed] = useState<bigint>(0n);
  const [feeWater, setFeeWater] = useState<bigint>(0n);
  const [feeTrain, setFeeTrain] = useState<bigint>(0n);

  const [loading, setLoading] = useState<"" | "feed" | "water" | "train">("");
  const [toast, setToast] = useState<string | null>(null);

  // ==========================================================
  // GET STATS
  // ==========================================================
  const { data: statsRaw, refetch: refetchStats } = useReadContract({
    address: CONTRACT,
    abi: careAbi,
    functionName: "getStats",
    args: wallet ? [wallet] : undefined,
    query: { enabled: Boolean(wallet) }
  });

  useEffect(() => {
    if (!statsRaw) return;

    const s = statsRaw as StatsStruct;
    const xpNum = Number(s.xp);
    const lvlNum = Number(s.level);
    const beansNum = Number(s.beans);

    setXp(xpNum);
    setLevel(lvlNum);
    setBeans(beansNum);

    onStatsUpdate?.(xpNum, beansNum);
  }, [statsRaw]);


  // ==========================================================
  // GET 3 FEE VALUES
  // ==========================================================
  const { data: feeFeedRaw } = useReadContract({
    address: CONTRACT,
    abi: careAbi,
    functionName: "feedFee",
  });
  const { data: feeWaterRaw } = useReadContract({
    address: CONTRACT,
    abi: careAbi,
    functionName: "waterFee",
  });
  const { data: feeTrainRaw } = useReadContract({
    address: CONTRACT,
    abi: careAbi,
    functionName: "trainFee",
  });

  useEffect(() => {
    if (feeFeedRaw) setFeeFeed(feeFeedRaw as bigint);
    if (feeWaterRaw) setFeeWater(feeWaterRaw as bigint);
    if (feeTrainRaw) setFeeTrain(feeTrainRaw as bigint);
  }, [feeFeedRaw, feeWaterRaw, feeTrainRaw]);


  // ==========================================================
  // DYNAMIC XP — Level scaling
  // nextLevelXP = (level + 1) * 100
  // xp progress = xp - (level * 100)
  // ==========================================================
  const maxXp = (level + 1) * 100;
  const currentXp = xp - level * 100;
  const xpPercent = Math.min(100, (currentXp / (maxXp - level * 100)) * 100);


  // ==========================================================
  // DO ACTION
  // ==========================================================
  async function doAction(action: "feed" | "water" | "train") {
    if (!isConnected || !wallet) {
      alert("Connect wallet first");
      return;
    }

    const fee =
      action === "feed" ? feeFeed :
      action === "water" ? feeWater :
      feeTrain;

    try {
      setLoading(action);

      const tx = await writeContractAsync({
        address: CONTRACT,
        abi: careAbi,
        functionName: action,
        value: fee
      });

      console.log("Tx sent:", tx);

      // tunggu block
      setTimeout(async () => {
        const updated = await refetchStats();
        if (!updated.data) return;

        const s = updated.data as StatsStruct;

        const newXp = Number(s.xp);
        const newBeans = Number(s.beans);

        const xpGain = newXp - xp;
        const beansGain = newBeans - beans;

        if (xpGain > 0 || beansGain > 0) {
          setToast(`+${xpGain} XP  +${beansGain} Beans`);
          setTimeout(() => setToast(null), 1800);
        }

        // Update Supabase
        await fetch("/api/updateStats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet,
            xp: newXp,
            level: Number(s.level),
            beans: newBeans
          })
        });

        setLoading("");

      }, 2500);

    } catch (err) {
      console.error(err);
      alert("Transaction failed.");
      setLoading("");
    }
  }


  // ==========================================================
  // RENDER UI
  // ==========================================================
  return (
    <div className="card bean-panel">

      <div className="title">My Bean</div>
      <div className="subtitle">Care for your Bean to earn BEANS & XP!</div>

      <div className="bean-image-wrap">
        <img src={bean?.image || "/bean.png"} className="bean-image" />
      </div>

      <div className="bean-level">Level {level}</div>

      <div className="xp-bar">
        <div className="xp-fill" style={{ width: `${xpPercent}%` }}></div>
      </div>

      <div className="xp-text">
        {currentXp} / {maxXp - level * 100} XP
      </div>

      <div className="bean-actions">
        <button
          className="bean-btn"
          disabled={loading === "feed"}
          onClick={() => doAction("feed")}
        >
          {loading === "feed" ? "Feeding..." : `🍞 Feed (${Number(feeFeed)/1e18} ETH)`}
        </button>

        <button
          className="bean-btn"
          disabled={loading === "water"}
          onClick={() => doAction("water")}
        >
          {loading === "water" ? "Watering..." : `💧 Water (${Number(feeWater)/1e18} ETH)`}
        </button>

        <button
          className="bean-btn"
          disabled={loading === "train"}
          onClick={() => doAction("train")}
        >
          {loading === "train" ? "Training..." : `🏋️ Train (${Number(feeTrain)/1e18} ETH)`}
        </button>
      </div>

      {toast &&
        createPortal(
          <div className="toast-popup">{toast}</div>,
          document.getElementById("toast-root") as HTMLElement
        )
      }
    </div>
  );
}
