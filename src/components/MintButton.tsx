import { useState } from "react";
import { useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { config } from "../wagmi";
import abi from "../abi/KimmiBeansNFT.json";
import Toast from "./Toast";

type Props = {
  userAddress: `0x${string}`;
  fid: number;
  username: string;
};

export default function MintButton({ userAddress, fid, username }: Props) {
  const [loading, setLoading] = useState(false);
  const [minted, setMinted] = useState(false);
  const [toast, setToast] = useState("");
  const [mintData, setMintData] = useState<{
    id: number;
    rarity: string;
    image: string;
  } | null>(null);

  const { writeContractAsync } = useWriteContract();

  async function handleMint() {
    try {
      setLoading(true);

      // 1. Send transaction
      const txHash = await writeContractAsync({
        abi,
        address: import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`,
        functionName: "mint",
      });

      // 2. Wait for confirmation
      const receipt = await waitForTransactionReceipt(config, {
        hash: txHash,
      });

      // 3. Read tokenId from Transfer event
      const log = receipt.logs?.[0] as any;
      const tokenId = parseInt(log.topics[3], 16);

      // 4. Fetch metadata
      const metaRes = await fetch(`/api/metadata/${tokenId}`);
      const metadata = await metaRes.json();

      setMintData({
        id: tokenId,
        rarity: metadata.attributes[0].value,
        image: metadata.image,
      });

      setMinted(true);
      setToast("🎉 Mint success!");

      setTimeout(() => setToast(""), 3000);

    } catch (err) {
      console.error(err);
      setToast("❌ Mint failed!");
      setTimeout(() => setToast(""), 3000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className="main-btn"
        disabled={minted || loading}
        onClick={handleMint}
      >
        {minted ? "Minted ✓" : loading ? "Minting..." : "Mint NFT"}
      </button>

      {/* Show minted result */}
      {mintData && (
        <div className="mint-card">
          <img src={mintData.image} className="mint-preview" />
          <div className="mint-info">
            <div>ID #{mintData.id}</div>
            <div>Rarity: {mintData.rarity}</div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} />}
    </>
  );
}