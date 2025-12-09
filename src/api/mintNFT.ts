// File ini optional. Tidak digunakan untuk mint, hanya template.

import ABI from "../abi/KimmiBeansNFT.json";

export const NFT_CONTRACT = {
  address: import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`,
  abi: ABI,
};
