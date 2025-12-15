import { supabase } from "../_supabase";
import fetch from "node-fetch";

const TEST_FID = 299929;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!process.env.ADMIN_NOTIFY_SECRET) {
      throw new Error("ADMIN_NOTIFY_SECRET is missing");
    }

    const auth = req.headers.authorization;
    if (auth !== `Bearer ${process.env.ADMIN_NOTIFY_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

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

    const response = await fetch(row.url, {
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

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`Farcaster error ${response.status}: ${text}`);
    }

    return res.status(200).json({
      ok: true,
      fid: row.fid,
      farcaster_response: text
    });
  } catch (err) {
    console.error("❌ FUNCTION CRASH", err);
    return res.status(500).json({
      error: err.message
    });
  }
}