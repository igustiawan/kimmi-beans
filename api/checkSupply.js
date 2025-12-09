import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  require("../../abi/KimmiBeansNFT.json"),
  provider
);

export default async function handler(req, res) {
  try {
    const total = await contract.totalMinted();
    const max = 10000;

    return res.status(200).json({
      totalMinted: Number(total),
      maxSupply: max,
      soldOut: Number(total) >= max
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
