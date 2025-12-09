import { supabase } from "../_supabase";

export default async function handler(req, res) {
  const { id } = req.query;
  const tokenId = parseInt(id);

  // Ambil metadata dari Supabase
  const { data, error } = await supabase
    .from("nft_metadata")
    .select("*")
    .eq("id", tokenId)
    .maybeSingle(); // <-- penting

  let rarity = data?.rarity ?? "common"; // fallback kalau belum ada insert

  return res.status(200).json({
    name: `Kimmi Bean #${tokenId}`,
    description: "Cute Bean NFT",
    image: `https://xkimmi.fun/beans/${rarity}.png`,
    attributes: [
      { trait_type: "Rarity", value: rarity }
    ]
  });
}
