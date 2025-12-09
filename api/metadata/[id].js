import { supabase } from "../_supabase";

export default async function handler(req, res) {
  const { id } = req.query;
  const tokenId = parseInt(id);

  // Ambil metadata (READ ONLY)
  const { data, error } = await supabase
    .from("nft_metadata")
    .select("*")
    .eq("id", tokenId)
    .maybeSingle();

  // Jika metadata tidak ditemukan → NFT belum dicetak
  if (!data) {
    return res.status(404).json({
      name: `Kimmi Bean #${tokenId}`,
      description: "This NFT has not been minted yet.",
      image: "https://xkimmi.fun/beans/unminted.png",
      attributes: [],
    });
  }

  return res.status(200).json({
    name: `Kimmi Bean #${tokenId}`,
    description: "Cute Bean NFT",
    image: `https://xkimmi.fun/beans/${data.rarity}.png`,
    attributes: [{ trait_type: "Rarity", value: data.rarity }],
  });
}
