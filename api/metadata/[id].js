import { supabase } from "../_supabase";

export default async function handler(req, res) {
  const { id } = req.query;
  const tokenId = parseInt(id);

  // ambil data user dari query (miniapp send?)
  const { fid, username, wallet } = req.query;

  // Cek metadata existing
  const { data, error } = await supabase
    .from("nft_metadata")
    .select("*")
    .eq("id", tokenId)
    .single();

  let rarity = data?.rarity;

  // Generate & insert kalau belum ada
  if (!rarity) {
    rarity = getRarity();

    await supabase.from("nft_metadata").insert([
      {
        id: tokenId,
        fid,
        username,
        wallet,
        rarity
      }
    ]);
  }

  res.status(200).json({
    name: `Kimmi Bean #${tokenId}`,
    description: "Cute Bean NFT",
    image: `https://xkimmi.fun/beans/${rarity}.png`,
    attributes: [{ trait_type: "Rarity", value: rarity }]
  });
}

function getRarity() {
  const r = Math.random();
  if (r > 0.98) return "legendary";
  if (r > 0.90) return "epic";
  if (r > 0.70) return "rare";
  return "common";
}
