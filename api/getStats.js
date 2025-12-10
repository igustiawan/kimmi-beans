import { supabase } from "./_supabase";

export default async function handler(req, res) {
  const { wallet } = req.query;

  if (!wallet) return res.status(400).json({ ok: false });

  const { data, error } = await supabase
    .from("bean_stats")
    .select("xp, beans")
    .eq("wallet", wallet)
    .single();

  if (error || !data) {
    return res.json({ ok: false, xp: 0, beans: 0 });
  }

  return res.json({
    ok: true,
    xp: data.xp,
    beans: data.beans,
  });
}
