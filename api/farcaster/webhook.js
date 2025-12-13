import { supabase } from "../_supabase";

function decodeBase64Json(str) {
  return JSON.parse(
    Buffer.from(str, "base64").toString("utf-8")
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const envelope = req.body;

  console.log("[FARCASTER RAW]", envelope);

  // ✅ decode header & payload
  const header = decodeBase64Json(envelope.header);
  const event = decodeBase64Json(envelope.payload);

  console.log("[FARCASTER HEADER]", header);
  console.log("[FARCASTER EVENT]", event);

  // 🔑 FID ADA DI HEADER
  const fid = header.fid;

  if (!fid) {
    console.error("❌ FID NOT FOUND");
    return res.status(400).json({ error: "Missing fid" });
  }

  // ✅ SAVE TOKEN
  if (event.notificationDetails) {
    const { token, url } = event.notificationDetails;

    await supabase
      .from("farcaster_notification_tokens") // JANGAN GANTI
      .upsert(
        {
          fid,
          token,
          url,
          updated_at: new Date()
        },
        { onConflict: "fid" }
      );

    console.log("✅ TOKEN SAVED", fid);
  }

  // ✅ REMOVE TOKEN
  if (
    event.event === "frame_removed" ||
    event.event === "notifications_disabled"
  ) {
    await supabase
      .from("farcaster_notification_tokens")
      .delete()
      .eq("fid", fid);

    console.log("🗑️ TOKEN REMOVED", fid);
  }

  return res.status(200).json({ ok: true });
}