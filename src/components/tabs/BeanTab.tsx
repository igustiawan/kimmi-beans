// src/components/tabs/BeanTab.tsx
import React from "react";
import EvolutionPanel from "../EvolutionPanel";
import type { DailySummary } from "../../types";

const DEV_FID = 299929;

interface Props {
  wallet?: string | null;
  isConnected: boolean;
  mintResult: { id: number; rarity: string; image: string } | null;
  lifetimeXp?: number;
  dailyBeans?: number;
  dailyLoading: boolean;
  dailySummary: DailySummary;
  canInteract: boolean;
  hasBeanStats: boolean;
  onRefreshDaily: () => void;
  onShare: () => Promise<void> | void;
  onStatsUpdate: (xp: number, beans: number) => void;
  fid?: number | null;
  displayName?: string | null;
}

export default function BeanTab({
  wallet, isConnected, mintResult, lifetimeXp, dailyBeans,
  dailyLoading, dailySummary, canInteract, hasBeanStats,
  onRefreshDaily, onShare, onStatsUpdate, fid, displayName
}: Props) {
  if (!isConnected || !wallet) {
    return (
      <div className="card">
        <div className="title">My Bean</div>
        <p>Please connect your wallet first.</p>
      </div>
    );
  }

  if (!mintResult) {
    return (
      <div className="card">
        <div className="title">My Bean</div>
        <p>You don’t own a Kimmi Bean NFT yet.</p>
        <button className="main-btn" onClick={() => window.dispatchEvent(new CustomEvent("openMint"))}>Mint Now 🫘</button>
      </div>
    );
  }

  if (!hasBeanStats) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Menunggu sinkronisasi data Bean</div>
        <div style={{ marginTop: 8, opacity: 0.9 }}>
          Kamu sudah mint NFT, tapi data profil Bean belum tersedia di server kami.
        </div>
        <div style={{ marginTop: 14 }}>
          <button className="main-btn" onClick={onRefreshDaily} disabled={dailyLoading}>
            {dailyLoading ? "Mengecek..." : "Cek ulang status"}
          </button>
        </div>
      </div>
    );
  }

if (fid === DEV_FID && !canInteract) {
    const lvl = dailySummary.level ?? Math.floor((lifetimeXp ?? 0) / 100);
    const beans = dailySummary.beans ?? (dailyBeans ?? 0);
    const rankDisplay = dailySummary.rank ? `#${dailySummary.rank}` : "Not ranked";

    return (
      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Bagikan progresmu — buka aksi harian!</div>
        <div style={{ marginTop: 8, opacity: 0.9 }}>
          Bagikan ringkasan (Level {lvl} • 🫘 {beans} • {rankDisplay}) ke Warpcast untuk membuka tombol Feed / Water / Train.
        </div>

        <div style={{ marginTop: 16 }}>
          <button className="main-btn" onClick={onShare} disabled={dailyLoading}>
            {dailyLoading ? "Membuka..." : "Share & Unlock 🚀"}
          </button>
        </div>

        <div style={{ marginTop: 12, color: "#666", fontSize: 13 }}>
          XP & Beans tetap berasal dari kontrak saat kamu melakukan aksi.
        </div>
      </div>
    );
  }

  // canInteract === true
  return (
    <EvolutionPanel
      wallet={wallet || undefined}
      isConnected={isConnected}
      bean={mintResult}
      fid={fid ?? null}
      username={displayName ?? null}
      onStatsUpdate={(xp:number, beans:number) => onStatsUpdate(xp, beans)}
      canInteract={true}
    />
  );
}