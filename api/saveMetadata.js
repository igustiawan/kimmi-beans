import { supabase } from "./_supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { tokenId, rarity, wallet, fid, username } = req.body;

  if (!tokenId || !wallet) {
    return res.status(400).json({ error: "Missing tokenId or wallet" });
  }

  // UPDATE row yang sudah dibuat oleh metadata/[id]
  const { error } = await supabase
    .from("nft_metadata")
    .update({
      rarity,
      wallet,
      fid: fid ?? null,
      username: username ?? null,
    })
    .eq("id", tokenId);

  if (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
}
