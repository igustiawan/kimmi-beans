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
        <img src="/bean_idle.png" alt="Bean Evolution" />
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
      <div className="evo-btn-group">
        <button className="evo-btn">🍞 Feed</button>
        <button className="evo-btn">💧 Water</button>
        <button className="evo-btn">🏋️ Train</button>
      </div>

      {/* Wallet */}
      {wallet && (
        <div className="wallet-display" style={{ marginTop: 20 }}>
          Wallet: {wallet.slice(0, 6)}...{wallet.slice(-4)}
        </div>
      )}

    </div>
  );
}
