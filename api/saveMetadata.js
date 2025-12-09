import { supabase } from "./_supabase";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { tokenId, rarity, wallet, fid, username } = req.body;

  if (!tokenId || !wallet || !rarity)
    return res.status(400).json({ error: "Missing fields" });

  // Insert metadata saat mint
  const { error } = await supabase
    .from("nft_metadata")
    .insert([
      { id: tokenId, rarity, wallet, fid, username }
    ]);

  if (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
}
