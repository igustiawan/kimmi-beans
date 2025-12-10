import React from "react";

interface Props {
  wallet: string | undefined;
  isConnected: boolean;
  bean: {
    id: number;
    rarity: string;
    image: string;
  } | null;
}

export default function EvolutionPanel({ bean }: Props) {
  // sementara hardcoded (nanti akan diambil dari DB)
  const level = 1;
  const xp = 30;
  const maxXp = 100;

  return (
    <div className="card bean-panel">

      {/* Title */}
      <div className="title">My Bean</div>
      <div className="subtitle">Care for your Bean to earn BEANS & XP!</div>

      {/* Bean Image */}
      <div className="bean-image-wrap">
        <img
          src={bean?.image || "/bean.png"}
          className="bean-image"
          alt="Bean Evolution"
        />
      </div>

      {/* Token + Rarity */}
      {bean && (
        <div className="bean-meta">
          <span className="token">Token #{bean.id}</span>
          <span className="rarity">
            Rarity: <b>{bean.rarity}</b>
          </span>
        </div>
      )}

      {/* Level */}
      <div className="bean-level">Level {level}</div>

      {/* XP BAR */}
      <div className="xp-bar">
        <div
          className="xp-fill"
          style={{ width: `${(xp / maxXp) * 100}%` }}
        ></div>
      </div>
      <div className="xp-text">{xp} / {maxXp} XP</div>

      {/* ACTION BUTTONS */}
      <div className="bean-actions">
        <button className="bean-btn">🍞 Feed</button>
        <button className="bean-btn">💧 Water</button>
        <button className="bean-btn">🏋️ Train</button>
      </div>

    </div>
  );
}
