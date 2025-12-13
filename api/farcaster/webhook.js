import { supabase } from "../_supabase";

function decodePayload(payload) {
  return JSON.parse(
    Buffer.from(payload, "base64").toString("utf-8")
  );
}

function decodeHeader(header) {
  return JSON.parse(
    Buffer.from(header, "base64").toString("utf-8")
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const envelope = req.body;

  console.log("[FARCASTER RAW]", envelope);

  const event = decodePayload(envelope.payload);
  const header = decodeHeader(envelope.header);

  console.log("[FARCASTER EVENT]", event);
  console.log("[FARCASTER HEADER]", header);

  const fid = header.fid; // 🔥 INI YANG TADI NULL

  // SAVE TOKEN
  if (event.notificationDetails) {
    const { token, url } = event.notificationDetails;

    const { error } = await supabase
      .from("farcaster_notification_tokens") // ⛔ JANGAN GANTI
      .upsert(
        {
          fid,
          token,
          url,
          created_at: new Date()
        },
        { onConflict: "fid" }
      );

    if (error) {
      console.error("❌ SUPABASE ERROR", error);
    } else {
      console.log("✅ TOKEN SAVED", fid);
    }
  }

  // REMOVE TOKEN
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