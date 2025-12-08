import { supabase } from "./_supabase";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { fid, username } = req.body;

    if (!fid) {
      return res.status(400).json({ error: "Missing FID" });
    }

    // CEK SUDAH ADA
    const { data: existing, error: checkErr } = await supabase
      .from("whitelist")
      .select("fid")
      .eq("fid", fid)
      .maybeSingle();

    if (checkErr) {
      return res.status(500).json({ error: checkErr.message });
    }

    if (existing) {
      return res.status(200).json({
        success: true,
        status: "already",
      });
    }

    // INSERT BARU
    const { error: insertErr } = await supabase
      .from("whitelist")
      .insert([{ fid, username }]);

    if (insertErr) {
      return res.status(500).json({ error: insertErr.message });
    }

    return res.status(200).json({
      success: true,
      status: "new",
    });

  } catch (e) {
    // fallback JSON agar TIDAK mengirim HTML
    return res.status(500).json({ error: e.message || "Unknown error" });
  }
}
