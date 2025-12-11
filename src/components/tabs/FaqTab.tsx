// src/components/tabs/FaqTab.tsx
import React from "react";

export default function FaqTab() {
  return (
    <div className="card">
      <div className="title">FAQ</div>
      <div style={{ textAlign: "left", width: "100%", maxWidth: 420 }}>
        <div style={{ marginBottom: 12 }}>
          <b>🫘 What is Kimmi Beans?</b>
          <div style={{ opacity: 0.9 }}>A fun Farcaster Mini App where you mint and grow your own Bean NFT.</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <b>⚡ How do I earn XP & Beans?</b>
          <div style={{ opacity: 0.9 }}>Take care of your Bean every day by feeding, watering, and training it.</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <b>📈 Which action gives the best reward?</b>
          <div style={{ opacity: 0.9 }}>Train &gt; Water &gt; Feed — higher difficulty = higher XP & Beans reward.</div>
        </div>
      </div>
    </div>
  );
}