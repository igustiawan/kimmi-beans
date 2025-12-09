import { supabase } from "../_supabase";

export default async function handler(req, res) {
  const { id } = req.query;
  const tokenId = parseInt(id);

  // 1. Cek apakah metadata ID ini sudah tersimpan
  const { data, error } = await supabase
    .from("nft_metadata")
    .select("*")
    .eq("id", tokenId)
    .single();

  let rarity = data?.rarity;

  // 2. Jika belum ada → generate random → simpan
  if (!rarity) {
    rarity = getRarity(); 

    await supabase
      .from("nft_metadata")
      .insert([{ id: tokenId, rarity }]);
  }

  // 3. Return metadata JSON untuk OpenSea
  res.status(200).json({
    name: `Kimmi Bean #${tokenId}`,
    description: "Cute Bean NFT",
    image: `https://xkimmi.fun/beans/${rarity}.png`,
    attributes: [
      { trait_type: "Rarity", value: rarity }
    ]
  });
}

function getRarity() {
  const r = Math.random();
  if (r > 0.98) return "legendary";      // 2%
  if (r > 0.90) return "epic";           // 8%
  if (r > 0.70) return "rare";           // 20%
  return "common";                       // 70%
}
