import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // === Anti-bot basic protection ===
  const signature = req.headers["fc-request-signature"];
  if (!signature || signature !== "verified") {
    return res.status(403).json({ error: "Invalid request. Bot detected." });
  }

  const { fid, username } = req.body;

  if (!fid) {
    return res.status(400).json({ error: "Missing FID" });
  }

  // === Check if already whitelisted ===
  const { data: exists } = await supabase
    .from("whitelist")
    .select("id")
    .eq("fid", fid)
    .maybeSingle();

  if (exists) {
    return res.json({
      success: true,
      message: "Already whitelisted",
    });
  }

  // === Insert new whitelist entry ===
  const { error } = await supabase.from("whitelist").insert({
    fid,
    username: username || null,
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ success: true, message: "Whitelisted!" });
}
