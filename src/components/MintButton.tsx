import { useState } from "react";
import { useWriteContract } from "wagmi";
import abi from "../abi/KimmiBeansNFT.json";
import { getRandomRarity } from "@utils/rarity";

type Props = {
  userAddress: `0x${string}`;
  onMintComplete: (data: { rarity: string; txHash: string }) => void;
};

export default function MintButton({ userAddress, onMintComplete }: Props) {
  const [loading, setLoading] = useState(false);

  const { writeContractAsync } = useWriteContract();

  async function handleMint() {
    try {
      setLoading(true);

      if (!userAddress) {
        alert("Wallet not connected!");
        return;
      }

      const rarity = getRandomRarity();

      const txHash = await writeContractAsync({
        abi,
        address: import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`,
        functionName: "mint",
        args: [userAddress],
      });

      onMintComplete({
        rarity,
        txHash,
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
