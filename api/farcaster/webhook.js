import { supabase } from "../_supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const event = req.body;

  console.log("[FARCASTER WEBHOOK]", JSON.stringify(event, null, 2));

  const fid = event.fid;

  // SAVE / UPDATE TOKEN
  if (event.notificationDetails && fid) {
    const { token, url } = event.notificationDetails;

    const { error } = await supabase
      .from("farcaster_notifications")
      .upsert({
        fid,
        token,
        url
      });

    if (error) {
      console.error("SUPABASE SAVE ERROR", error);
      return res.status(500).json({ error: "db error" });
    }

    console.log("TOKEN SAVED", { fid, token });
  }

  // REMOVE TOKEN
  if (
    event.event === "miniapp_removed" ||
    event.event === "notifications_disabled"
  ) {
    await supabase
      .from("farcaster_notifications")
      .delete()
      .eq("fid", fid);

    console.log("TOKEN REMOVED", fid);
  }

  return res.status(200).json({ ok: true });
}