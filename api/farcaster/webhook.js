import { supabase } from "../_supabase";

function decodePayload(payload) {
  return JSON.parse(
    Buffer.from(payload, "base64").toString("utf-8")
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const envelope = req.body;

  console.log("[FARCASTER RAW]", envelope);

  if (!envelope.payload) {
    return res.status(400).json({ error: "Missing payload" });
  }

  const event = decodePayload(envelope.payload);

  console.log("[FARCASTER EVENT]", event);

  /**
   * event = {
   *   event: "frame_added" | "frame_removed" | "notifications_enabled" | ...
   *   fid: number
   *   notificationDetails?: { token, url }
   * }
   */

  const fid = event.fid;

  // ✅ SAVE TOKEN
  if (event.notificationDetails) {
    const { token, url } = event.notificationDetails;

    await supabase
      .from("farcaster_notification") // ⛔ jangan ganti nama
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
      .from("farcaster_notification")
      .delete()
      .eq("fid", fid);

    console.log("🗑️ TOKEN REMOVED", fid);
  }

  return res.status(200).json({ ok: true });
}