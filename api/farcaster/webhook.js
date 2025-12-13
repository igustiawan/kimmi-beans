import { supabase } from "../_supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { payload } = req.body;

  if (!payload) {
    console.log("NO PAYLOAD");
    return res.status(200).json({ ok: true });
  }

  // 🔑 DECODE BASE64 PAYLOAD
  const decoded = JSON.parse(
    Buffer.from(payload, "base64").toString("utf8")
  );

  console.log("[FARCASTER EVENT]", decoded);

  const fid = decoded.fid;
  const eventType = decoded.event;

  // SAVE TOKEN
  if (decoded.notificationDetails) {
    const { token, url } = decoded.notificationDetails;

    await supabase
      .from("farcaster_notification") // ✅ sesuai tabel kamu
      .upsert(
        {
          fid,
          token,
          url,
          updated_at: new Date()
        },
        { onConflict: "fid" }
      );

    console.log("TOKEN SAVED", fid);
  }

  // REMOVE TOKEN
  if (
    eventType === "miniapp_removed" ||
    eventType === "notifications_disabled"
  ) {
    await supabase
      .from("farcaster_notification") // ⛔ tadi kamu salah tabel
      .delete()
      .eq("fid", fid);

    console.log("TOKEN REMOVED", fid);
  }

  return res.status(200).json({ ok: true });
}