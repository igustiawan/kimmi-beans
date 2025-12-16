// src/components/MintPanel.tsx
import MintButton from "./MintButton";

type MintResult = {
  id: number;
  rarity: string;
  image: string;
};

type Props = {
  isConnected: boolean;
  wallet?: `0x${string}`;
  soldOut: boolean;
  totalMinted: number;
  maxSupply: number;

  mintResult: MintResult | null;
  mintImageLoading: boolean;
  preloadedMintImage: string | null;

  fid: number;
  username: string;

  onConnect: () => void;
  onMintSuccess: (d: MintResult) => void;
  onShare: () => void;
};

export default function MintPanel({
  isConnected,
  wallet,
  soldOut,
  totalMinted,
  maxSupply,
  mintResult,
  mintImageLoading,
  preloadedMintImage,
  fid,
  username,
  onConnect,
  onMintSuccess,
  onShare
}: Props) {
  return (
    <div className="card">
      <div className="title">Kimmi Beans</div>
      <div className="subtitle">Mint cute, unique beans every day!</div>

      {/* IMAGE */}
      <div className="image-container" style={{ position: "relative" }}>
        <img
          src="/bean.gif"
          alt="Bean placeholder"
          style={{
            width: "100%",
            borderRadius: 12,
            display: "block",
            filter: mintImageLoading
              ? "blur(6px) brightness(0.9)"
              : "none",
            transition: "filter 240ms ease"
          }}
        />

        {preloadedMintImage && (
          <img
            src={preloadedMintImage}
            alt="Minted Bean"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: 12,
              opacity: mintImageLoading ? 0 : 1,
              transition: "opacity 260ms ease"
            }}
          />
        )}

        {mintImageLoading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none"
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                border: "4px solid rgba(255,255,255,0.6)",
                borderTopColor: "rgba(255,255,255,0.95)",
                animation: "km-spin 1s linear infinite",
                boxShadow: "0 6px 18px rgba(0,0,0,0.12)"
              }}
            />
          </div>
        )}

        <style>{`
          @keyframes km-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>

      {/* COUNTER */}
      <div className="counter">
        {soldOut ? (
          <b>🎉 Sold Out — {maxSupply} / {maxSupply}</b>
        ) : (
          <b>{totalMinted} / {maxSupply} Minted</b>
        )}
      </div>

      {/* ACTION */}
      {!mintResult && (
        <>
          {!isConnected && (
            <button className="main-btn" onClick={onConnect}>
              Connect Wallet
            </button>
          )}

          {isConnected && wallet && (
            soldOut ? (
              <button className="main-btn disabled">
                Sold Out 🎉
              </button>
            ) : (
              <MintButton
                userAddress={wallet}
                fid={fid}
                username={username}
                onMintSuccess={onMintSuccess}
              />
            )
          )}
        </>
      )}

      {/* AFTER MINT */}
      {mintResult && (
        <>
          <div className="mint-info">
            Token #{mintResult.id} — Rarity:{" "}
            <b>{mintResult.rarity}</b>
          </div>

          <button className="share-btn" onClick={onShare}>
            Share to Cast 🚀
          </button>
        </>
      )}
    </div>
  );
}