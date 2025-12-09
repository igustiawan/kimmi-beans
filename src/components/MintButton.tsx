import { useState } from "react";
import { getRandomRarity } from "@utils/rarity";
import { mintNFT } from "@api/mintNFT";

interface MintButtonProps {
  onMintComplete: (data: {
    rarity: string;
    tokenId: number;
    tx: string;
  }) => void;
}

export default function MintButton({ onMintComplete }: MintButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleMint() {
    try {
      setLoading(true);

      const rarity = getRandomRarity();
      const result = await mintNFT(); // tokenId + txHash

      onMintComplete({
        rarity,
        tokenId: result.tokenId,
        tx: result.txHash,
      });
    } catch (err) {
      console.error(err);
      alert("Mint failed!");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="main-btn" disabled={loading} onClick={handleMint}>
      {loading ? "Minting..." : "Mint NFT"}
    </button>
  );
}
