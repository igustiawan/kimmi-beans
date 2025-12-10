import { supabase } from "./_supabase";

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase
      .from("bean_stats")
      .select("wallet, fid, username, xp, level, beans")
      .order("level", { ascending: false })
      .order("beans", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Leaderboard error:", error);
      return res.status(400).json({ error });
    }

    return res.status(200).json({ leaderboard: data });

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server crashed" });
  }
}
