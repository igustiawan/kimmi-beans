// src/components/tabs/MintTab.tsx
import React from "react";
import MintButton from "../MintButton";

interface Props {
  isConnected: boolean;
  wallet?: string | null;
  mintResult: { id:number, rarity:string, image:string } | null;
  soldOut: boolean;
  totalMinted: number;
  MAX_SUPPLY: number;
  connect: () => void;
  onMintSuccess: (d: {id:number, rarity:string, image:string}) => void;
}

export default function MintTab({ isConnected, wallet, mintResult, soldOut, totalMinted, MAX_SUPPLY, connect, onMintSuccess }: Props) {
  return (
    <div className="card">
      <div className="title">Kimmi Beans</div>
      <div className="subtitle">Mint cute, unique beans every day!</div>

      <div className="image-container">
        {mintResult ? (
          <img src={mintResult.image} alt="Minted Bean" />
        ) : (
          <img src="/bean.gif" alt="Bean" />
        )}
      </div>

      <div className="counter">
        {soldOut ? (
          <b>🎉 Sold Out — {MAX_SUPPLY} / {MAX_SUPPLY}</b>
        ) : (
          <b>{totalMinted} / {MAX_SUPPLY} Minted</b>
        )}
      </div>

      {!mintResult && (
        <>
          {!isConnected && (
            <button className="main-btn" onClick={connect}>Connect Wallet</button>
          )}

            {isConnected && wallet && (
            soldOut ? (
                <button className="main-btn disabled">Sold Out 🎉</button>
            ) : (
                <MintButton
                userAddress={wallet as `0x${string}`}
                fid={0}
                username={""}
                onMintSuccess={onMintSuccess}
                />
            )
            )}
        </>
      )}

      {mintResult && (
        <>
          <div className="mint-info">Token #{mintResult.id} — Rarity: <b>{mintResult.rarity}</b></div>
        </>
      )}
    </div>
  );
}