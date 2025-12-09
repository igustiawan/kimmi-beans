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

  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const { writeContractAsync } = useWriteContract();

  // --- 1. Tunggu transaksi selesai ---
  const { data: receipt } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
  });

  // --- 2. Kalau receipt sudah ada → proses tokenId + metadata ---
  useEffect(() => {
    if (!receipt) return;

    async function processMint() {
      // Tambahan fix TS: guard kedua
      if (!receipt) return;

      try {
        const event = receipt.logs?.[0];
        const rawId = event?.topics?.[3];
        if (!rawId) throw new Error("Token ID not found");

        const tokenId = parseInt(rawId, 16);

        const meta = await fetch(`/api/metadata/${tokenId}`).then(r => r.json());

        const rarity = meta.attributes?.[0]?.value || "common";
        const image = meta.image;

        setMintData({ id: tokenId, rarity, image });

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
    }

    processMint();
  }, [receipt]);


  // --- 3. Handle mint click ---
  async function handleMint() {
    try {
      setLoading(true);

      // Call contract
      const hash = await writeContractAsync({
        abi,
        address: import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`,
        functionName: "mint",
      });

      // Simpan hash → trigger receipt watcher
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

      {/* Preview setelah mint */}
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