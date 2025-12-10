import { supabase } from "./_supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { wallet, xp, level, beans } = req.body;

  if (!wallet) {
    return res.status(400).json({ error: "Missing wallet" });
  }

  const { error } = await supabase
    .from("bean_stats")
    .upsert({
      wallet,
      xp,
      level,
      beans,
      last_action: new Date(),
      updated_at: new Date(),
    });

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error });
  }

  return res.json({ ok: true });
}