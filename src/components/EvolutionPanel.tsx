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

  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [beans, setBeans] = useState(0);
  const [actionFee, setActionFee] = useState<bigint>(0n);

  // tambahan UI
  const [loading, setLoading] = useState<"" | "feed" | "water" | "train">("");
  const [toast, setToast] = useState<string | null>(null);

  // -------- GET STATS ----------
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

  // -------- READ actionFee ----------
  const { data: feeRaw } = useReadContract({
    address: CONTRACT,
    abi: careAbi,
    functionName: "actionFee", // <-- PENTING! lowercase
  });

  useEffect(() => {
    if (feeRaw) setActionFee(feeRaw as bigint);
  }, [feeRaw]);


  // -------- DO ACTION ----------
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
        value: actionFee, // FEE BENAR
      });

      console.log("Tx submitted:", tx);

      setTimeout(async () => {
        const updated = await refetchStats();
        if (!updated.data) return;

        const stats = updated.data as StatsStruct;

        const newXp = Number(stats.xp);
        const newBeans = Number(stats.beans);

        const xpGain = newXp - xp;
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


  return (
    <div className="card bean-panel">

      <div className="title">My Bean</div>
      <div className="subtitle">Care for your Bean to earn BEANS & XP!</div>

      <div className="bean-image-wrap">
        <img src={bean?.image || "/bean.png"} className="bean-image" />
      </div>

      <div className="bean-level">Level {level}</div>

      <div className="xp-bar">
        <div className="xp-fill" style={{ width: `${(xp % 100)}%` }}></div>
      </div>

      <div className="xp-text">{xp % 100} / 100 XP</div>

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

        {toast &&
        createPortal(
            <div className="toast-popup">{toast}</div>,
            document.getElementById("toast-root") as HTMLElement
        )
        }
    </div>
  );
}
