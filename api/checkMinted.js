import { supabase } from "./_supabase";

export default async function handler(req, res) {
  const { wallet } = req.query;

  if (!wallet)
    return res.status(400).json({ minted: false });

  const { data, error } = await supabase
    .from("nft_metadata")
    .select("*")
    .eq("wallet", wallet)
    .maybeSingle();

  if (error) {
    console.error(error);
    return res.status(500).json({ minted: false });
  }

  if (!data)
    return res.status(200).json({ minted: false });

  return res.status(200).json({
    minted: true,
    tokenId: data.id,
    rarity: data.rarity,
    image: `https://xkimmi.fun/beans/${data.rarity}.png`
  });
}
