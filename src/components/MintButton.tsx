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

export default function MintButton({
  userAddress,
  fid,
  username,
  onMintSuccess,
}: MintButtonProps) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { writeContractAsync } = useWriteContract();
  const { data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

  /** PROSES SETELAH TX CONFIRMED */
  useEffect(() => {
    if (!receipt) return;

    const processMint = async () => {
      try {
        // Cari log Transfer ERC721 (topics[0] = Transfer event signature)
        const transferLog = receipt.logs?.find(
          (l) =>
            l.topics &&
            l.topics[0] ===
              "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
        );

        const rawId = transferLog?.topics?.[3];
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

        /** Kirim ke App.tsx → UI langsung berubah */
        onMintSuccess({ id: tokenId, rarity, image });

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
      if (!userAddress) {
        setToast("❌ Connect wallet first!");
        return;
      }

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
        {loading ? "Minting..." : "Mint NFT"}
      </button>

      {toast && <Toast message={toast} />}
    </>
  );
}
