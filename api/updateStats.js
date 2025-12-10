import { supabase } from "./_supabase";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Parse JSON body
    let body = req.body;
    if (typeof req.body === "string") {
      body = JSON.parse(req.body);
    }

    const { wallet, xp, level, beans } = body;

    if (!wallet) {
      return res.status(400).json({ error: "Missing wallet" });
    }

    const { data, error } = await supabase
      .from("bean_stats")
      .upsert({
        wallet,
        xp,
        level,
        beans,
        last_action: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

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