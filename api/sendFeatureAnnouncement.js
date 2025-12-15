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

  const fid = 299929; // 🧪 TEST FID

  // ambil token notif dari DB
  const { data, error } = await supabase
    .from("farcaster_notification_tokens")
    .select("*")
    .eq("fid", fid)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "No token for fid" });
  }

  // 📦 payload notif (schema BENAR & TERBUKTI WORK)
  const payload = {
    notificationId: `kimmi-feature-${Date.now()}`,
    title: "🔥 New Feature on Kimmi Beans",
    body: "You can now view your Neynar Score and Tier directly.",
    targetUrl: "https://kimmibeans.xyz/frame",
    tokens: [data.token]
  };

  // 🚀 kirim ke Farcaster (TANPA auth header)
  const resp = await fetch(data.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const json = await resp.json();

  return res.status(200).json({
    ok: resp.ok,
    farcaster: json
  });
}