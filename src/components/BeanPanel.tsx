// src/components/BeanPanel.tsx
import EvolutionPanel from "./EvolutionPanel";

type MintResult = {
  id: number;
  rarity: string;
  image: string;
};

type Props = {
  wallet: string | null;
  isConnected: boolean;
  mintResult: MintResult | null;
  fid: number | null;
  username: string | null;

  // stats
  headerStatsReady: boolean;

  // callbacks
  onGoMint: () => void;
  onStatsUpdate: (xp: number, beans: number) => void;
};

export default function BeanPanel({
  wallet,
  isConnected,
  mintResult,
  fid,
  username,
  headerStatsReady,
  onGoMint,
  onStatsUpdate
}: Props) {
  // =========================
  // NOT CONNECTED
  // =========================
  if (!isConnected || !wallet) {
    return (
      <div className="card">
        <div className="title">My Bean</div>
        <p>Please connect your wallet first.</p>
      </div>
    );
  }

  // =========================
  // WAIT HEADER STATS
  // =========================
  if (!headerStatsReady) {
    return (
      <div className="card">
        <div className="title">My Bean</div>
        <p>Loading your bean stats…</p>
      </div>
    );
  }

  // =========================
  // NO BEAN YET
  // =========================
  if (!mintResult) {
    return (
      <div
        style={{
          background: "linear-gradient(180deg,#fff6f0,#ffe6ca)",
          borderRadius: 18,
          padding: "28px 20px",
          textAlign: "center",
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          marginTop: 12
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 10 }}>🌱</div>

        <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>
          Your Bean Awaits
        </div>

        <div
          style={{
            fontSize: 14,
            opacity: 0.75,
            lineHeight: 1.5,
            maxWidth: 260,
            margin: "0 auto 18px"
          }}
        >
          Mint your first Bean to unlock daily actions, levels,
          and climb the leaderboard.
        </div>

        <button
          onClick={onGoMint}
          style={{
            padding: "12px 22px",
            borderRadius: 999,
            background: "linear-gradient(90deg,#ffb07a,#ff9548)",
            color: "white",
            border: "none",
            fontWeight: 800,
            fontSize: 15,
            cursor: "pointer",
            boxShadow: "0 6px 16px rgba(255,149,72,0.35)"
          }}
        >
          🌱 Plant My First Bean
        </button>
      </div>
    );
  }

  // =========================
  // HAVE BEAN
  // =========================
  return (
    <EvolutionPanel
      wallet={wallet}
      isConnected={isConnected}
      bean={mintResult}
      fid={fid}
      username={username}
      onStatsUpdate={onStatsUpdate}
    />
  );
}
