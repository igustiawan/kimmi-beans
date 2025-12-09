declare module "@api/mintNFT" {
  export function mintNFT(): Promise<{
    tokenId: number;
    txHash: string;
  }>;
}
