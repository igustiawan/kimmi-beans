import { supabase } from "../_supabase";

export default async function handler(req, res) {
  const { id } = req.query;
  const tokenId = parseInt(id);

  const { data, error } = await supabase
    .from("nft_metadata")
    .select("*")
    .eq("id", tokenId)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Metadata not found" });
  }

  const rarity = data.rarity;

  return res.status(200).json({
    name: `Kimmi Bean #${tokenId}`,
    description: "Cute Bean NFT",
    image: `https://xkimmi.fun/beans/${rarity}.png`,
    attributes: [{ trait_type: "Rarity", value: rarity }]
  });
}