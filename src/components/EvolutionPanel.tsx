import React from "react";

interface Props {
  wallet: string | undefined;
  isConnected: boolean;
  mintRarity: string | null;
}

export default function EvolutionPanel({ wallet, isConnected, mintRarity }: Props) {
  const level = 1;
  const xp = 30;
  const maxXp = 100;

  return (
    <div className="card">

      <div className="title">My Bean</div>
      <div className="subtitle">Care for your Bean to earn BEANS & XP!</div>

      {/* Bean Image */}
      <div className="image-container">
        <img src="/bean.png" alt="Bean Evolution" />
      </div>

      {/* Rarity */}
      {mintRarity && (
        <div className="rarity-label">
          Rarity: <b>{mintRarity}</b>
        </div>
      )}

      {/* Level */}
      <div className="section">
        <div style={{ fontSize: 16, fontWeight: 700 }}>
          Level {level}
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="progress-wrapper">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(xp / maxXp) * 100}%` }}
          ></div>
        </div>
        <div className="progress-text">
          {xp} / {maxXp} XP
        </div>
      </div>

      {/* Action Buttons */}
        <div className="action-buttons">
        <button className="action-btn">🍞 Feed</button>
        <button className="action-btn">💧 Water</button>
        <button className="action-btn">🏋️ Train</button>
        </div>

    </div>
  );
}
