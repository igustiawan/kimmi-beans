import { supabase } from "./_supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { tokenId, fid, username, wallet } = req.body;

  if (!tokenId || !wallet) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Update baris metadata yang sudah ada
  const { error } = await supabase
    .from("nft_metadata")
    .update({ fid, username, wallet })
    .eq("id", tokenId);

  if (error) {
    console.log(error);
    return res.status(500).json({ error: "Failed to update metadata" });
  }

  return res.status(200).json({ ok: true });
}