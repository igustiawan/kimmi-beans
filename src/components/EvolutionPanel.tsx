import { useEffect, useState } from "react";

interface Props {
  wallet?: string | null;
  isConnected: boolean;
  mintRarity: string | null; // bonus system nanti
}

export default function EvolutionPanel({ wallet, isConnected, mintRarity }: Props) {
  // === LOCAL DUMMY STATE (nanti diganti data on-chain) ===
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const XP_MAX = 20;

  const [cooldown, setCooldown] = useState(false);

  // === Dummy cooldown (2 detik biar keliatan work) ===
  function triggerCooldown() {
    setCooldown(true);
    setTimeout(() => setCooldown(false), 2000);
  }

  // === Placeholder action before contract logic ===
  function actionFeed() {
    if (cooldown) return alert("Cooldown active!");
    triggerCooldown();

    setXp((prev) => {
      const newXP = prev + 1;
      if (newXP >= XP_MAX) {
        setLevel((l) => l + 1);
        return 0;
      }
      return newXP;
    });
  }

  function actionWater() {
    if (cooldown) return alert("Cooldown active!");
    triggerCooldown();

    setXp((prev) => {
      const newXP = prev + 1;
      if (newXP >= XP_MAX) {
        setLevel((l) => l + 1);
        return 0;
      }
      return newXP;
    });
  }

  function actionTrain() {
    if (cooldown) return alert("Cooldown active!");
    triggerCooldown();

    setXp((prev) => {
      const newXP = prev + 2;
      if (newXP >= XP_MAX) {
        setLevel((l) => l + 1);
        return 0;
      }
      return newXP;
    });
  }

  return (
    <div className="evo-card">
      <div className="title">My Bean Evolution</div>
      <div className="subtitle">
        Grow your bean by doing daily on-chain actions ☘️
      </div>

      {/* WALLET CHECK */}
      {!isConnected && (
        <div className="not-connected">
          Please connect wallet first.
        </div>
      )}

      {isConnected && (
        <>
          <div className="evo-status">
            <div><b>Level:</b> {level}</div>
            <div><b>XP:</b> {xp} / {XP_MAX}</div>
          </div>

          {/* XP BAR */}
          <div className="xp-bar">
            <div
              className="xp-fill"
              style={{ width: `${(xp / XP_MAX) * 100}%` }}
            ></div>
          </div>

          {/* BONUS INFO if user minted */}
          {mintRarity && (
            <div className="rarity-bonus">
              🎉 Your NFT rarity <b>{mintRarity}</b> gives special bonuses!
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="actions">
            <button
              disabled={cooldown}
              onClick={actionFeed}
              className="btn-action"
            >
              🍞 Feed
            </button>

            <button
              disabled={cooldown}
              onClick={actionWater}
              className="btn-action"
            >
              💧 Water
            </button>

            <button
              disabled={cooldown}
              onClick={actionTrain}
              className="btn-action"
            >
              🏋️ Train
            </button>
          </div>

          {/* COOLDOWN STATUS */}
          {cooldown && (
            <div className="cooldown-text">⏳ Cooldown...</div>
          )}

        </>
      )}
    </div>
  );
}
