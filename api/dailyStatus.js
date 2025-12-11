// /api/dailyStatus.js
import { supabase } from "./_supabase";

/**
 * GET /api/dailyStatus?wallet=0x...
 * or POST body { wallet: "0x..." }
 *
 * Response:
 * 200 {
 *   user: { wallet, level, xp, beans, fid, username, last_shared_date, can_interact, ... } | null,
 *   userRank: number | null,
 *   can_interact: boolean,
 *   last_shared_date: string | null
 * }
 */

export default async function handler(req, res) {
  try {
    const wallet =
      (req.method === "GET" ? req.query.wallet : (typeof req.body === "string" ? JSON.parse(req.body).wallet : req.body?.wallet)) ||
      null;

    if (!wallet) {
      return res.status(400).json({ error: "Missing wallet param" });
    }

    const w = String(wallet).toLowerCase();

    // 1) fetch user row from bean_stats
    const { data: userRow, error: userErr } = await supabase
      .from("bean_stats")
      .select("wallet, level, xp, beans, fid, username, last_shared_date, can_interact, updated_at")
      .eq("wallet", w)
      .maybeSingle();

    if (userErr) {
      console.error("dailyStatus: bean_stats lookup error:", userErr);
      // continue but respond with fallback empty
    }

    if (!userRow) {
      // user not present in bean_stats yet
      return res.status(200).json({
        user: null,
        userRank: null,
        can_interact: false,
        last_shared_date: null,
      });
    }

    // normalize numeric fields
    const userLevel = Number(userRow.level ?? 0);
    const userBeans = Number(userRow.beans ?? 0);

    // 2) count rows with strictly higher level
    const { error: c1err, count: higherLevelCount } = await supabase
      .from("bean_stats")
      .select("wallet", { count: "exact", head: true })
      .gt("level", userLevel);

    if (c1err) {
      console.warn("dailyStatus: count higher level error:", c1err);
    }

    // 3) count rows with same level but strictly higher beans
    const { error: c2err, count: higherBeansCount } = await supabase
      .from("bean_stats")
      .select("wallet", { count: "exact", head: true })
      .eq("level", userLevel)
      .gt("beans", userBeans);

    if (c2err) {
      console.warn("dailyStatus: count higher beans error:", c2err);
    }

    const rank =
      (Number(higherLevelCount ?? 0) + Number(higherBeansCount ?? 0) + 1) || null;

    return res.status(200).json({
      user: {
        wallet: userRow.wallet,
        level: Number(userRow.level ?? 0),
        xp: Number(userRow.xp ?? 0),
        beans: Number(userRow.beans ?? 0),
        fid: userRow.fid ?? null,
        username: userRow.username ?? null,
        updated_at: userRow.updated_at ?? null
      },
      userRank: rank,
      can_interact: Boolean(userRow.can_interact),
      last_shared_date: userRow.last_shared_date ?? null
    });
  } catch (err) {
    console.error("dailyStatus handler error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}