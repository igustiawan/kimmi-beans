import { supabase } from "../_supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const event = req.body;

  console.log("[FARCASTER WEBHOOK]", event);

  const fid = event.fid;

  // SAVE TOKEN
  if (event.notificationDetails) {
    const { token, url } = event.notificationDetails;

    await supabase
      .from("farcaster_notification")   // ⛔ JANGAN GANTI NAMA
      .upsert({
        fid,
        token,
        url,
        updated_at: new Date()
      }, { onConflict: "fid" });

    console.log("TOKEN SAVED", fid);
  }

  // REMOVE TOKEN
  if (
    event.event === "miniapp_removed" ||
    event.event === "notifications_disabled"
  ) {
    await supabase
      .from("notification_tokens")
      .delete()
      .eq("fid", fid);

    console.log("TOKEN REMOVED", fid);
  }

  return res.status(200).json({ ok: true });
}