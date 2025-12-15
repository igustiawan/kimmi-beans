import { supabase } from "./_supabase";

export default async function handler(req, res) {
  // ✅ method guard
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 🔐 admin-only authorization
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.ADMIN_NOTIFY_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // ambil semua token notif
  const { data: rows, error } = await supabase
    .from("farcaster_notification_tokens")
    .select("token, url");

  if (error || !rows || rows.length === 0) {
    return res.status(404).json({ error: "No notification tokens found" });
  }

  // ⚠️ IMPORTANT:
  // url biasanya SAMA untuk semua row (app-level)
  // ambil satu saja
  const notifyUrl = rows[0].url;

  // kumpulin semua token user
  const tokens = rows.map(r => r.token);

  // 📦 payload notif (schema yang TERBUKTI WORK)
  const payload = {
    notificationId: `kimmi-feature-${Date.now()}`,
    title: "🔥 New Feature on Kimmi Beans",
    body: "You can now view your Neynar Score and Tier directly.",
    targetUrl: "https://xkimmi.fun",
    tokens
  };

  // 🚀 kirim ke Farcaster (1 request = banyak user)
  const resp = await fetch(notifyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const json = await resp.json();

  return res.status(200).json({
    ok: resp.ok,
    sent: tokens.length,
    farcaster: json
  });
}