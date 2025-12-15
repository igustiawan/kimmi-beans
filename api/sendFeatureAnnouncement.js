import { supabase } from "../_supabase";

const TEST_FID = 299929; // 🔒 SAFE MODE

export default async function handler(req, res) {
  // 1️⃣ Method guard
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 2️⃣ Admin auth guard
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.ADMIN_NOTIFY_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // 3️⃣ Ambil token HANYA untuk 1 FID
  const { data: row, error } = await supabase
    .from("farcaster_notification_tokens")
    .select("fid, token, url")
    .eq("fid", TEST_FID)
    .single();

  if (error || !row) {
    console.error("❌ TOKEN NOT FOUND", error);
    return res.status(404).json({
      error: "Token not found for test fid",
      fid: TEST_FID
    });
  }

  // 4️⃣ Kirim notif
  try {
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

    if (!response.ok) {
      console.warn("⚠️ NOTIF FAILED", row.fid, response.status);
      return res.status(500).json({
        ok: false,
        fid: row.fid,
        status: response.status
      });
    }

    console.log("✅ TEST NOTIF SENT", row.fid);

    return res.status(200).json({
      ok: true,
      fid: row.fid
    });
  } catch (err) {
    console.error("❌ SEND ERROR", err);
    return res.status(500).json({
      ok: false,
      error: "Send failed"
    });
  }
}