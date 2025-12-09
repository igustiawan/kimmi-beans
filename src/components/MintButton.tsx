import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import abi from "../abi/KimmiBeansNFT.json";
import Toast from "./Toast";

type MintButtonProps = {
  userAddress: `0x${string}`;
  fid: number;
  username: string;
  onMintSuccess: (data: { id: number; rarity: string; image: string }) => void;
};

type MintResult = {
  id: number;
  rarity: string;
  image: string;
};

export default function MintButton({ userAddress, fid, username, onMintSuccess }: MintButtonProps) {
  const [loading, setLoading] = useState(false);
  const [minted, setMinted] = useState(false);
  const [toast, setToast] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { writeContractAsync } = useWriteContract();
  const { data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

  /** PROSES SETELAH TX CONFIRMED */
  useEffect(() => {
    if (!receipt) return;

    const processMint = async () => {
      try {
        const log = receipt.logs?.[0];
        const rawId = log?.topics?.[3];
        if (!rawId) throw new Error("Token ID missing");

        const tokenId = parseInt(rawId, 16);

        /** Ambil metadata server */
        const meta = await fetch(`/api/metadata/${tokenId}`).then((r) => r.json());

        const rarity = meta.attributes?.[0]?.value || "common";
        const image = meta.image;

        /** Simpan ke Supabase */
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

        /** Kirim hasil mint ke App.tsx */
        onMintSuccess({ id: tokenId, rarity, image });

        setMinted(true);

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

  /** Handle Mint */
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
      setLoading(false);
    }
  }

  return (
    <>
      <button className="main-btn" disabled={loading} onClick={handleMint}>
        {loading ? "Minting..." : minted ? "Minted ✓" : "Mint NFT"}
      </button>

      {toast && <Toast message={toast} />}
    </>
  );
}
