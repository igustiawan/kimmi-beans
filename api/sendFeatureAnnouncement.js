import { supabase } from "../_supabase";

export const config = {
  runtime: "nodejs"
};

const TEST_FID = 299929;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const appSecret = process.env.FARCASTER_APP_SECRET;
    if (!appSecret) {
      throw new Error("FARCASTER_APP_SECRET missing");
    }

    // admin guard (opsional tapi recommended)
    if (req.headers.authorization !== `Bearer ${process.env.ADMIN_NOTIFY_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // ambil token + url
    const { data: row, error } = await supabase
      .from("farcaster_notification_tokens")
      .select("token, url")
      .eq("fid", TEST_FID)
      .limit(1)
      .maybeSingle();

    if (error || !row) {
      return res.status(404).json({ error: "Token not found" });
    }

    const notificationId = `kimmi-feature-${Date.now()}`;

    const fcRes = await fetch(row.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appSecret}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        notificationId,
        title: "🔥 New Feature on Kimmi Beans",
        body: "You can now view your Neynar Score and Tier directly.",
        targetUrl: "https://kimmibeans.xyz/frame",
        tokens: [row.token] // ⬅️ INI KUNCINYA
      })
    });

    const text = await fcRes.text();

    if (!fcRes.ok) {
      throw new Error(`Farcaster ${fcRes.status}: ${text}`);
    }

    return res.status(200).json({
      ok: true,
      fid: TEST_FID
    });
  } catch (e) {
    console.error("❌ NOTIF ERROR", e);
    return res.status(500).json({ error: e.message });
  }
}