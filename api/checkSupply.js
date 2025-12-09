import { supabase } from "./_supabase";

export default async function handler(req, res) {
  const { count, error } = await supabase
    .from("nft_metadata")
    .select("*", { count: "exact", head: true });

  if (error) return res.status(500).json({ totalMinted: 0 });

  const MAX_SUPPLY = 10000;

  return res.status(200).json({
    totalMinted: count,
    soldOut: count >= MAX_SUPPLY
  });
}
