import { supabase } from "../_supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { tokenId, rarity, wallet, fid, username } = req.body;

  if (!tokenId || !wallet) {
    return res.status(400).json({ error: "Missing tokenId or wallet" });
  }

  const { data, error } = await supabase
    .from("nft_metadata")
    .insert([
      {
        id: tokenId,
        rarity,
        wallet,
        fid,
        username,
      }
    ]);

  if (error) {
    return res.status(500).json({ error });
  }

  return res.status(200).json({ ok: true });
}
