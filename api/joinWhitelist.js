import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: "Supabase keys missing" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { fid, username } = req.body;

  if (!fid) {
    return res.status(400).json({ error: "Missing FID" });
  }

  // Insert ke DB
  const { data, error } = await supabase
    .from("whitelist")
    .insert([{ fid, username }]);

  if (error) {
    console.error("Supabase error:", error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true, data });
}
