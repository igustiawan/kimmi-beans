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

  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);

  const { writeContractAsync } = useWriteContract();

  // === Wait transaction confirmation ===
  const { data: receipt } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // === When receipt exists → process metadata ===
  useEffect(() => {
    if (!receipt) return; // Fix TS warning

    const process = async () => {
      try {
        const log = receipt.logs?.[0];
        const rawId = log?.topics?.[3];
        if (!rawId) throw new Error("Token ID missing");

        const tokenId = parseInt(rawId, 16);

        // Fetch metadata JSON (OpenSea-compatible)
        const meta = await fetch(`/api/metadata/${tokenId}`).then((r) => r.json());

        const rarity = meta.attributes?.[0]?.value || "common";
        const image = meta.image;

        // Show preview
        setMintData({ id: tokenId, rarity, image });

        // Save metadata to Supabase via API
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
      } catch (e) {
        console.error(e);
        setToast("❌ Failed to process metadata");
        setTimeout(() => setToast(""), 3000);
      } finally {
        setLoading(false);
      }
    };

    process();
  }, [receipt]);

  // === Handle mint click ===
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