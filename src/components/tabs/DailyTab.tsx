// src/components/tabs/DailyTab.tsx
import React from "react";
import type { DailySummary } from "../../types";

interface Props {
  wallet?: string | null;
  displayName?: string | null;
  lifetimeXp?: number;
  dailyBeans?: number;
  dailyLoading: boolean;
  dailySummary: DailySummary;
  canInteract: boolean;
  hasBeanStats: boolean;
  onRefresh: () => void;
  onShare: () => Promise<void> | void;
}

export default function DailyTab({
  wallet, displayName, lifetimeXp, dailyBeans,
  dailyLoading, dailySummary, canInteract, hasBeanStats,
  onRefresh, onShare
}: Props) {
  const lvl = dailySummary.level ?? Math.floor((lifetimeXp ?? 0) / 100);
  const beans = dailySummary.beans ?? (dailyBeans ?? 0);
  const rankDisplay = dailySummary.rank ? `#${dailySummary.rank}` : "Not ranked";
  const usernameText = dailySummary.username || displayName || wallet;

  if (!wallet) {
    return (
      <div className="card">
        <div className="title">Daily Progress</div>
        <p>Please connect your wallet</p>
      </div>
    );
  }

  if (!hasBeanStats) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Menunggu sinkronisasi data Bean</div>
        <div style={{ marginTop: 8, opacity: 0.9 }}>
          Data Bean belum tersedia di server — biasanya selesai beberapa menit setelah mint.
        </div>
        <div style={{ marginTop: 14 }}>
          <button className="main-btn" onClick={onRefresh} disabled={dailyLoading}>
            {dailyLoading ? "Mengecek..." : "Cek ulang status"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ alignItems: "stretch" }}>
      <div style={{ textAlign: "center", width: "100%" }}>
        <div className="title">Daily Progress</div>
        <div className="subtitle">Bagikan progresmu — bantu Kimmi Beans dikenal lebih luas.</div>
      </div>

      <div style={{ width: "100%", maxWidth: 420, marginTop: 8 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ fontSize: 14, opacity: 0.9 }}>
            <b>{usernameText}</b> — Level <b>{lvl}</b> • 🫘 <b>{beans}</b>
          </div>

          <div style={{ fontSize: 13, color: "#333", opacity: 0.85 }}>
            Current Rank: <b>{rankDisplay}</b>
          </div>

          <div style={{ fontSize: 13, color: "#666" }}>
            Bagikan ringkasan ini ke Warpcast untuk menunjukkan progress kamu.
          </div>

          <div style={{ marginTop: 8 }}>
            <button className="share-btn" onClick={onShare} disabled={dailyLoading}>
              {dailyLoading ? "Sharing..." : "Share your progress 🚀"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
