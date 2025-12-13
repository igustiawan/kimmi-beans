// src/sections/BeanViewer.tsx
import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import careAbi from "../abi/kimmiBeansCare.json";

type LeaderItem = {
  wallet: string;
  username?: string;
};

type BeanViewerProps = {
  wallet: string;
  contract: `0x${string}`;
  leaderboard?: LeaderItem[]; // ✅ OPTIONAL
  onClose: () => void;
};

type StatsStruct = {
  xp: bigint;
  level: bigint;
  beans: bigint;
  lastAction: bigint;
};

export default function BeanViewer({
  wallet,
  contract,
  leaderboard,
  onClose,
}: BeanViewerProps) {
  // ------------------------------------------------------------
  // ON-CHAIN STATS
  // ------------------------------------------------------------
  const { data: statsRaw } = useReadContract({
    address: contract,
    abi: careAbi,
    functionName: "getStats",
    args: [wallet],
  });

  const stats = statsRaw as StatsStruct | undefined;

  // ------------------------------------------------------------
  // METADATA (image + rarity)
  // ------------------------------------------------------------
  const [meta, setMeta] = useState<{
    tokenId?: number;
    rarity?: string;
    image?: string;
  } | null>(null);

  const [loadingImage, setLoadingImage] = useState(false);
  const [readyImage, setReadyImage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMeta() {
      setMeta(null);
      setReadyImage(null);
      setLoadingImage(true);

      try {
        const res = await fetch(`/api/checkMinted?wallet=${wallet}`);
        const data = await res.json();
        if (!data.minted || cancelled) {
          setLoadingImage(false);
          return;
        }

        setMeta({
          tokenId: data.tokenId,
          rarity: data.rarity,
          image: data.image,
        });

        if (data.image) {
          const img = new Image();
          img.src = data.image;
          img.onload = () => {
            if (cancelled) return;
            setReadyImage(data.image);
            setLoadingImage(false);
          };
          img.onerror = () => {
            if (cancelled) return;
            setLoadingImage(false);
          };
        } else {
          setLoadingImage(false);
        }
      } catch {
        setLoadingImage(false);
      }
    }

    loadMeta();
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  // ------------------------------------------------------------
  // OPTIONAL RANK / USERNAME
  // ------------------------------------------------------------
  const player = leaderboard
    ? leaderboard.find(
        (p) => p.wallet.toLowerCase() === wallet.toLowerCase()
      )
    : null;

  const rank =
    leaderboard && player
      ? leaderboard.findIndex(
          (p) => p.wallet.toLowerCase() === wallet.toLowerCase()
        ) + 1
      : null;

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------
  return (
    <div style={{ padding: 18, maxWidth: 480, margin: "0 auto" }}>
      {/* BACK */}
      <button
        onClick={onClose}
        style={{
          background: "transparent",
          border: "none",
          fontWeight: 700,
          cursor: "pointer",
          marginBottom: 12,
          color: "#222",
        }}
        aria-label="Back"
      >
        ← Back
      </button>

      <div
        style={{
          background: "linear-gradient(180deg,#fff6f0,#ffe6ca)",
          borderRadius: 14,
          padding: 18,
          textAlign: "center",
        }}
      >
        {/* IMAGE */}
        <div
          style={{
            width: 220,
            height: 220,
            margin: "0 auto",
            borderRadius: 14,
            background: "#f9e4d0",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {loadingImage && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "4px solid rgba(0,0,0,0.15)",
                  borderTopColor: "rgba(0,0,0,0.55)",
                  animation: "km-spin 1s linear infinite",
                }}
              />
            </div>
          )}

          {readyImage && (
            <img
              src={readyImage}
              alt="Bean NFT"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: 14,
                opacity: loadingImage ? 0 : 1,
                transition: "opacity 260ms ease",
              }}
            />
          )}

          <style>{`
            @keyframes km-spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>

        {/* NAME */}
        <h2 style={{ marginTop: 12 }}>
          {player?.username ||
            `${wallet.slice(0, 6)}…${wallet.slice(-4)}`}
        </h2>

        {/* STATS */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            marginTop: 14,
          }}
        >
          <Stat label="Level" value={stats ? Number(stats.level) : "—"} />
          <Stat label="XP" value={stats ? Number(stats.xp) : "—"} />
          <Stat label="Beans" value={stats ? Number(stats.beans) : "—"} />
          <Stat label="Rank" value={rank ?? "—"} />
        </div>

        {/* META */}
        {meta?.tokenId && (
          <div style={{ marginTop: 14, fontSize: 13 }}>
            Token #{meta.tokenId} —{" "}
            <b>{meta.rarity || "—"}</b>
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// SMALL STAT COMPONENT
// ------------------------------------------------------------
function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12, opacity: 0.75 }}>{label}</div>
    </div>
  );
}
