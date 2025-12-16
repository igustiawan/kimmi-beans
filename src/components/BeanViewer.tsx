// src/components/BeanViewer.tsx
import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import careAbi from "../abi/kimmiBeansCare.json";

type StatsStruct = {
  xp: bigint;
  level: bigint;
  beans: bigint;
  lastAction: bigint;
};

type Meta = {
  tokenId?: number;
  rarity?: string;
  image?: string;
};

type Player = {
  wallet: `0x${string}`;
  username?: string;
};

type Props = {
  wallet: `0x${string}`;
  leaderboard: Player[];
  contract: `0x${string}`;
  onClose: () => void;
};

export default function BeanViewer({
  wallet,
  leaderboard,
  contract,
  onClose
}: Props) {
  const { data: statsRaw } = useReadContract({
    address: contract,
    abi: careAbi,
    functionName: "getStats",
    args: [wallet]
  });

  const [meta, setMeta] = useState<Meta | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);

  // =========================
  // LOAD NFT META
  // =========================
  useEffect(() => {
    let mounted = true;

    async function loadMeta() {
      setLoadingMeta(true);
      try {
        const res = await fetch(`/api/checkMinted?wallet=${wallet}`);
        const data = await res.json();
        if (!mounted) return;

        if (data.minted) {
          setMeta({
            tokenId: data.tokenId,
            rarity: data.rarity,
            image: data.image
          });
        } else {
          setMeta(null);
        }
      } catch {
        if (mounted) setMeta(null);
      } finally {
        if (mounted) setLoadingMeta(false);
      }
    }

    loadMeta();
    return () => {
      mounted = false;
    };
  }, [wallet]);

  const stats = statsRaw as StatsStruct | undefined;

  const player = leaderboard.find(
    (p) => p.wallet.toLowerCase() === wallet.toLowerCase()
  );

  const rank = player
    ? leaderboard.findIndex(
        (p) => p.wallet.toLowerCase() === wallet.toLowerCase()
      ) + 1
    : null;

  // =========================
  // RENDER
  // =========================
  return (
    <div style={{ padding: 18, maxWidth: 480, margin: "0 auto" }}>
      <button
        onClick={onClose}
        style={{
          display: "inline-block",
          marginBottom: 12,
          background: "transparent",
          border: "none",
          color: "#222",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: 14
        }}
      >
        ← Back
      </button>

      <div
        style={{
          background: "linear-gradient(180deg,#fff6f0,#ffe6ca)",
          borderRadius: 14,
          padding: 18,
          textAlign: "center"
        }}
      >
        {/* IMAGE */}
        <div
          style={{
            width: 220,
            height: 220,
            margin: "0 auto",
            borderRadius: 14,
            position: "relative",
            overflow: "hidden",
            background: "#f9e4d0"
          }}
        >
          {loadingMeta && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "4px solid rgba(0,0,0,0.12)",
                  borderTopColor: "rgba(0,0,0,0.55)",
                  animation: "km-spin 1s linear infinite"
                }}
              />
            </div>
          )}

          {meta?.image && (
            <img
              src={meta.image}
              alt="Bean NFT"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: 12,
                opacity: loadingMeta ? 0 : 1,
                transition: "opacity 260ms ease"
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

        <h2 style={{ marginTop: 12 }}>
          {player?.username ||
            `${wallet.slice(0, 6)}…${wallet.slice(-4)}`}
        </h2>

        {/* STATS */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            marginTop: 12
          }}
        >
          <Stat label="Level" value={stats ? Number(stats.level) : "—"} />
          <Stat label="XP" value={stats ? Number(stats.xp) : "—"} />
          <Stat label="Beans" value={stats ? Number(stats.beans) : "—"} />
          <Stat label="Rank" value={rank ?? "—"} />
        </div>

        {meta?.tokenId && (
          <div style={{ marginTop: 12, fontSize: 13 }}>
            Token #{meta.tokenId} — Rarity <b>{meta.rarity}</b>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12, opacity: 0.75 }}>{label}</div>
    </div>
  );
}