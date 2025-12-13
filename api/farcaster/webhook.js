import { supabase } from "../_supabase";

function decodeBase64Json(b64) {
  return JSON.parse(
    Buffer.from(b64, "base64").toString("utf-8")
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const envelope = req.body;

  console.log("[FARCASTER RAW]", envelope);

  if (!envelope.header || !envelope.payload) {
    return res.status(400).json({ error: "Invalid webhook envelope" });
  }

  // ✅ AMBIL FID DARI HEADER
  const header = decodeBase64Json(envelope.header);
  const fid = header.fid;

  // ✅ EVENT DATA DARI PAYLOAD
  const event = decodeBase64Json(envelope.payload);

  console.log("[FARCASTER EVENT]", { fid, ...event });

  // ===============================
  // SAVE TOKEN
  // ===============================
  if (event.notificationDetails) {
    const { token, url } = event.notificationDetails;

    await supabase
      .from("farcaster_notification") // ⛔ JANGAN GANTI NAMA
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

  // ===============================
  // REMOVE TOKEN
  // ===============================
  if (
    event.event === "frame_removed" ||
    event.event === "notifications_disabled"
  ) {
    await supabase
      .from("farcaster_notification")
      .delete()
      .eq("fid", fid);

    console.log("🗑️ TOKEN REMOVED", fid);
  }

  return res.status(200).json({ ok: true });
}