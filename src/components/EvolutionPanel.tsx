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

  const [loadingAction, setLoadingAction] = useState<null | string>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  // =====================================================
  // 1. READ USER STATS
  // =====================================================
  const { data: userStats, refetch: refetchStats } = useReadContract({
    address: CONTRACT,
    abi: careAbi,
    functionName: "getStats",
    args: wallet ? [wallet] : undefined,
    query: { enabled: Boolean(wallet) }
  });

  useEffect(() => {
    if (!userStats || !Array.isArray(userStats)) return;

    const xpNum = Number(userStats[0]);
    const levelNum = Number(userStats[1]);
    const beansNum = Number(userStats[2]);

    setXp(xpNum);
    setLevel(levelNum);
    setBeans(beansNum);

    if (onStatsUpdate) onStatsUpdate(xpNum, beansNum);
  }, [userStats]);


  // =====================================================
  // 2. READ actionFee FROM CONTRACT
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
  // 3. PERFORM ACTION (FEED / WATER / TRAIN)
  // =====================================================
  async function doAction(action: "feed" | "water" | "train") {
    if (!isConnected || !wallet) {
      alert("Connect wallet first");
      return;
    }

    try {
      setLoadingAction(action);
      console.log("Using contract fee:", actionFee.toString());

      const tx = await writeContractAsync({
        address: CONTRACT,
        abi: careAbi,
        functionName: action,
        value: actionFee,
      });

      console.log("Tx sent:", tx);

      // Wait then refresh
      setTimeout(async () => {
        const updated = await refetchStats();

        if (!updated.data || !Array.isArray(updated.data)) {
          console.error("Invalid stats returned:", updated.data);
          setLoadingAction(null);
          return;
        }

        const newXp = Number(updated.data[0]);
        const newLevel = Number(updated.data[1]);
        const newBeans = Number(updated.data[2]);

        // Calculate gain
        const xpGain = newXp - xp;
        const beansGain = newBeans - beans;

        if (xpGain > 0 || beansGain > 0) {
          showToast(`+${xpGain} XP   +${beansGain} Beans`);
        }

        // Update UI instantly
        setXp(newXp);
        setLevel(newLevel);
        setBeans(newBeans);

        if (onStatsUpdate) onStatsUpdate(newXp, newBeans);

        // Save to DB
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

        setLoadingAction(null);

      }, 2500);

    } catch (err) {
      console.error("Transaction failed:", err);
      alert("Transaction failed — check gas or fee.");
      setLoadingAction(null);
    }
  }


  // =====================================================
  // UI
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
        <button
          className="bean-btn"
          disabled={loadingAction === "feed"}
          onClick={() => doAction("feed")}
        >
          {loadingAction === "feed" ? "⏳ Feeding..." : "🍞 Feed"}
        </button>

        <button
          className="bean-btn"
          disabled={loadingAction === "water"}
          onClick={() => doAction("water")}
        >
          {loadingAction === "water" ? "⏳ Watering..." : "💧 Water"}
        </button>

        <button
          className="bean-btn"
          disabled={loadingAction === "train"}
          onClick={() => doAction("train")}
        >
          {loadingAction === "train" ? "⏳ Training..." : "🏋️ Train"}
        </button>
      </div>

      {/* TOAST */}
      {toast && (
        <div className="toast-popup">
          {toast}
        </div>
      )}
    </div>
  );
}