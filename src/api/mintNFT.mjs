import { BrowserProvider, Contract } from "ethers";

const CONTRACT = import.meta.env.VITE_CONTRACT_ADDRESS;

const ABI = [
  "function mint(address to) public returns(uint256)"
];

export async function mintNFT() {
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const contract = new Contract(CONTRACT, ABI, signer);

  const tx = await contract.mint(await signer.getAddress());
  const receipt = await tx.wait();

  const tokenId = Number(receipt.logs[0].topics[3]);

  return {
    tokenId,
    txHash: tx.hash
  };
}
