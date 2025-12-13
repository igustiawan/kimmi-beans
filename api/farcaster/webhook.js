import { supabase } from "../_supabase";

function decodePayload(base64) {
  const json = Buffer.from(base64, "base64").toString("utf8");
  return JSON.parse(json);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { payload } = req.body;
  const data = decodePayload(payload);

  console.log("[DECODED EVENT]", data);

  const { event, notificationDetails } = data;
  const fid = data.fid; // kadang ada, kadang tidak (Warpcast inconsistency)

  if (notificationDetails) {
    const { token, url } = notificationDetails;

    await supabase
      .from("farcaster_notification") // 
      .upsert({
        fid,
        token,
        url
      });

    console.log("TOKEN SAVED", { fid, token });
  }

  if (event === "miniapp_removed" || event === "notifications_disabled") {
    await supabase
      .from("farcaster_notification")
      .delete()
      .eq("fid", fid);

    console.log("TOKEN REMOVED", fid);
  }

  return res.status(200).json({ ok: true });
}
