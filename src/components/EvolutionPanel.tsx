import careAbi from "../abi/kimmiBeansCare.json";
import { useWriteContract } from "wagmi";

const CONTRACT = "0xEfBA09f6c35b2F3AB95853C0ef7b2df5Df30b30A";
const ACTION_FEE = BigInt(1000000000000); // EXACT match contract

export default function EvolutionPanel({ bean, wallet, isConnected }: Props) {

  const { writeContractAsync } = useWriteContract();

  async function doAction(action: "feed" | "water" | "train") {
    if (!isConnected || !wallet) {
      alert("Connect wallet first");
      return;
    }

    try {
      const tx = await writeContractAsync({
        address: CONTRACT,
        abi: careAbi,
        functionName: action,
        value: ACTION_FEE,     // <-- FIXED
      });

      console.log("Tx submitted:", tx);
    } catch (err) {
      console.error("Transaction failed:", err);
    }
  }

  return (
    <div className="card bean-panel">

      <div className="title">My Bean</div>
      <div className="subtitle">Care for your Bean to earn BEANS & XP!</div>

      <div className="bean-image-wrap">
        <img src={bean?.image || "/bean.png"} className="bean-image" />
      </div>

      <div className="bean-actions">
        <button className="bean-btn" onClick={() => doAction("feed")}>🍞 Feed</button>
        <button className="bean-btn" onClick={() => doAction("water")}>💧 Water</button>
        <button className="bean-btn" onClick={() => doAction("train")}>🏋️ Train</button>
      </div>
    </div>
  );
}
