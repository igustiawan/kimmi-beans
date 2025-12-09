import { supabase } from "../_supabase";

export default async function handler(req, res) {
  const { id } = req.query;
  const tokenId = parseInt(id);

  // check existing metadata
  const { data } = await supabase
    .from("nft_metadata")
    .select("*")
    .eq("id", tokenId)
    .single();

  let rarity = data?.rarity;

  // generate if not exist
  if (!rarity) {
    rarity = getRarity();

    await supabase.from("nft_metadata").insert([
      {
        id: tokenId,
        rarity,
        fid: null,
        username: null,
        wallet: null,
      }
    ]);
  }

  res.status(200).json({
    name: `Kimmi Bean #${tokenId}`,
    description: "Cute Bean NFT",
    image: `https://xkimmi.fun/beans/${rarity}.png`,
    attributes: [{ trait_type: "Rarity", value: rarity }],
  });
}

function getRarity() {
  const r = Math.random();
  if (r > 0.98) return "legendary";
  if (r > 0.90) return "epic";
  if (r > 0.70) return "rare";
  return "common";
}
