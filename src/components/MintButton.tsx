import { useState } from "react";
import { useWriteContract } from "wagmi";
import abi from "../abi/KimmiBeansNFT.json";
import Toast from "./Toast";

export default function MintButton({ userAddress }) {
  const [loading, setLoading] = useState(false);
  const [minted, setMinted] = useState(false);
  const [toast, setToast] = useState("");
  
  const { writeContractAsync } = useWriteContract();

  async function handleMint() {
    try {
      setLoading(true);

      const tx = await writeContractAsync({
        abi,
        address: import.meta.env.VITE_CONTRACT_ADDRESS,
        functionName: "mint",
      });

      setMinted(true);
      setToast("🎉 Minted successfully!");

      // hilangkan toast setelah 3 detik
      setTimeout(() => setToast(""), 3000);

    } catch (err) {
      setToast("❌ Mint failed!");
      setTimeout(() => setToast(""), 3000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button className="main-btn" disabled={minted || loading} onClick={handleMint}>
        {minted ? "Minted ✓" : loading ? "Minting..." : "Mint NFT"}
      </button>

      {toast && <Toast message={toast} />}
    </>
  );
}
