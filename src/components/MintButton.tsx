import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import abi from "../abi/KimmiBeansNFT.json";
import Toast from "./Toast";

type MintButtonProps = {
  userAddress: `0x${string}`;
  fid: number;
  username: string;
};

type MintResult = {
  id: number;
  rarity: string;
  image: string;
};

export default function MintButton({ userAddress, fid, username }: MintButtonProps) {
  const [loading, setLoading] = useState(false);
  const [minted, setMinted] = useState(false);
  const [toast, setToast] = useState("");
  const [mintData, setMintData] = useState<MintResult | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { writeContractAsync } = useWriteContract();

  /** WAIT RECEIPT */
  const { data: receipt } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
  });

  /** LOCAL RARITY */
  function getRarity() {
    const r = Math.random();
    if (r > 0.98) return "legendary";
    if (r > 0.9) return "epic";
    if (r > 0.7) return "rare";
    return "common";
  }

  /** PROCESS RECEIPT */
  useEffect(() => {
    if (!receipt) return;           // 🔥 FIX #1: Early guard (TS stops warning)
    if (!receipt.logs) return;      // 🔥 FIX #2

    const processMint = async () => {
      try {
        // 🔥 FIX #3: runtime safety wrapper
        if (!receipt || !receipt.logs) return;

        const log = receipt.logs.find((l) => l.topics?.length === 4);
        if (!log) throw new Error("Transfer event missing");

        const rawId = log.topics?.[3];
        if (!rawId) throw new Error("Token ID missing");

        const tokenId = parseInt(rawId, 16);

        // UI rarity only
        const rarity = getRarity();
        const image = `https://xkimmi.fun/beans/${rarity}.png`;

        setMintData({ id: tokenId, rarity, image });

        // Save for dashboard
        await fetch("/api/saveMetadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tokenId,
            rarity,
            wallet: userAddress,
            fid,
            username,
          }),
        });

        setMinted(true);
        setToast("🎉 Minted successfully!");
        setTimeout(() => setToast(""), 3000);
      } catch (err) {
        console.error(err);
        setToast("❌ Metadata error");
        setTimeout(() => setToast(""), 3000);
      } finally {
        setLoading(false);
      }
    };

    processMint();
  }, [receipt]);

  /** HANDLE MINT */
  async function handleMint() {
    try {
      setLoading(true);

      const hash = await writeContractAsync({
        abi,
        address: import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`,
        functionName: "mint",
      });

      setTxHash(hash);
    } catch (err) {
      console.error(err);
      setToast("❌ Mint failed!");
      setTimeout(() => setToast(""), 3000);
      setLoading(false);
    }
  }

  return (
    <>
      <button className="main-btn" disabled={loading} onClick={handleMint}>
        {loading ? "Minting..." : minted ? "Minted ✓" : "Mint NFT"}
      </button>

      {toast && <Toast message={toast} />}

      {mintData && (
        <div className="mint-card">
          <img src={mintData.image} className="mint-preview" alt="Minted Bean" />
          <div className="mint-info">
            Token #{mintData.id} — Rarity: <b>{mintData.rarity}</b>
          </div>
        </div>
      )}
    </>
  );
}