// src/sections/MintSection.tsx
import MintButton from "../components/MintButton";

type MintSectionProps = {
  wallet?: `0x${string}`;
  isConnected: boolean;
  connect: () => void;

  hasMinted: boolean;
  mintResult: {
    id: number;
    rarity: string;
    image?: string;
  } | null;

  mintImageLoading: boolean;
  preloadedMintImage: string | null;

  onShareMint: () => void;
};

const MAX_SUPPLY = 10000;

export default function MintSection({
  wallet,
  isConnected,
  connect,
  hasMinted,
  mintResult,
  mintImageLoading,
  preloadedMintImage,
  onShareMint,
}: MintSectionProps) {
  return (
    <div className="card">
      <div className="title">Kimmi Beans</div>
      <div className="subtitle">
        Mint cute, unique beans every day!
      </div>

      {/* IMAGE AREA */}
      <div
        className="image-container"
        style={{ position: "relative" }}
      >
        {/* PLACEHOLDER (always rendered to avoid layout jump) */}
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
            transition: "filter 240ms ease",
          }}
        />

        {/* PRELOADED REAL IMAGE (fade-in, no flash) */}
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
              transition: "opacity 260ms ease",
            }}
          />
        )}

        {/* SPINNER DURING PRELOAD */}
        {mintImageLoading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
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
                boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
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

      {/* COUNTER (static for now, supply handled elsewhere if needed) */}
      <div className="counter">
        <b>{MAX_SUPPLY.toLocaleString()} Total Supply</b>
      </div>

      {/* ACTION AREA */}
      {!hasMinted && (
        <>
          {!isConnected && (
            <button
              className="main-btn"
              onClick={connect}
            >
              Connect Wallet
            </button>
          )}

          {isConnected && wallet && (
            <MintButton
              userAddress={wallet}
              fid={0}
              username=""
              onMintSuccess={() => {
                // ⛔ DO NOTHING HERE
                // mint detection handled by useMiniAppBoot
              }}
            />
          )}
        </>
      )}

      {/* AFTER MINT */}
      {hasMinted && mintResult && (
        <>
          <div className="mint-info">
            Token #{mintResult.id} — Rarity{" "}
            <b>{mintResult.rarity}</b>
          </div>

          <button
            className="share-btn"
            onClick={onShareMint}
          >
            Share to Cast 🚀
          </button>
        </>
      )}
    </div>
  );
}