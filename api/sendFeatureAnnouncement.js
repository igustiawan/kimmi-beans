import { supabase } from "../_supabase";

export const config = {
  runtime: "nodejs"
};

const TEST_FID = 299929;

export default async function handler(req, res) {
  try {
    // Method guard
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Secret guard
    const secret = process.env.ADMIN_NOTIFY_SECRET;
    if (!secret) {
      throw new Error("ADMIN_NOTIFY_SECRET missing");
    }

    // Auth guard
    if (req.headers.authorization !== `Bearer ${secret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get token for single FID
    const { data: row, error } = await supabase
      .from("farcaster_notification_tokens")
      .select("fid, token, url")
      .eq("fid", TEST_FID)
      .limit(1)
      .maybeSingle();

    if (error || !row) {
      return res.status(404).json({
        error: "Token not found",
        fid: TEST_FID
      });
    }

    // Send Farcaster notification
    const fcRes = await fetch(row.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${row.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        notification: {
          title: "🔥 New Feature on Kimmi Beans",
          body: "You can now view your Neynar Score and Tier directly.",
          target_url: "https://kimmibeans.xyz/frame"
        }
      })
    });

    if (!fcRes.ok) {
      const text = await fcRes.text();
      throw new Error(`Farcaster ${fcRes.status}: ${text}`);
    }

    return res.status(200).json({
      ok: true,
      fid: row.fid
    });
  } catch (e) {
    console.error("❌ NOTIF ERROR", e);
    return res.status(500).json({
      error: e.message
    });
  }
}