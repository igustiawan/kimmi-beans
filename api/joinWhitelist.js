import { supabase } from "./_supabase";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { fid, username } = req.body;

  if (!fid) return res.status(400).json({ error: "Missing FID" });

  // Cek sudah daftar?
  const { data: exists } = await supabase
    .from("whitelist")
    .select("fid")
    .eq("fid", fid)
    .maybeSingle();

  if (exists) {
    return res.status(200).json({
      success: true,
      status: "already",
    });
  }

  // Insert baru
  const { error } = await supabase
    .from("whitelist")
    .insert([{ fid, username }]);

  if (error) {
    return res.status(500).json({ success: false, error: error.message });
  }

  return res.status(200).json({
    success: true,
    status: "new",
  });
}
