import { supabase } from "../_supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const event = req.body;

  console.log("[FARCASTER WEBHOOK]", JSON.stringify(event, null, 2));

  // SAVE TOKEN
  if (event.notificationDetails) {
    const { token, url } = event.notificationDetails;
    const fid = event.fid;

    const { error } = await supabase
      .from("farcaster_notification_tokens")
      .upsert({
        fid,
        token,
        url
      });

    if (error) {
      console.error("SUPABASE SAVE ERROR", error);
    }
  }

  // REMOVE TOKEN
  if (
    event.event === "miniapp_removed" ||
    event.event === "notifications_disabled"
  ) {
    await supabase
      .from("farcaster_notification_tokens")
      .delete()
      .eq("fid", event.fid);
  }

  return res.status(200).json({ ok: true });
}