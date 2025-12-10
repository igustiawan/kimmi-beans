import { supabase } from "./_supabase";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Parse JSON body safely
    let body = req.body;
    if (typeof req.body === "string") {
      try {
        body = JSON.parse(req.body);
      } catch (e) {
        return res.status(400).json({ error: "Invalid JSON body" });
      }
    }

    const { wallet, xp, level, beans, fid, username } = body;

    if (!wallet) {
      return res.status(400).json({ error: "Missing wallet" });
    }

    const { data, error } = await supabase
      .from("bean_stats")
      .upsert(
        {
          wallet,
          fid: fid ?? null,
          username: username ?? null,
          xp,
          level,
          beans,
          last_action: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "wallet" } // pastikan merge berdasarkan wallet
      );

    if (error) {
      console.error("Supabase error:", error);
      return res.status(400).json({ error });
    }

    return res.status(200).json({ ok: true, data });

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server crashed" });
  }
}