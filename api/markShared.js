// api/markShared.js
import { supabase } from "./_supabase";

function utcIsoNow() {
  return new Date().toISOString();
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const wallet = (body?.wallet || "").toLowerCase();
    const fid = body?.fid ?? null;

    if (!wallet) return res.status(400).json({ error: "Missing wallet" });

    const now = utcIsoNow();

    // Upsert last_shared_date and can_interact
    const { data, error } = await supabase.from("bean_stats").upsert([{
      wallet,
      fid,
      last_shared_date: now,
      can_interact: true,
      updated_at: now
    }], { onConflict: "wallet" });

    if (error) {
      console.error("markShared upsert error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error("markShared handler error:", err);
    return res.status(500).json({ error: "Server crashed" });
  }
}
