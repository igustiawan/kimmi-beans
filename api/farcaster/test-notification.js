import { supabase } from "../_supabase";

export default async function handler(req, res) {
  const fid = 299929; // TEST FID

  const { data, error } = await supabase
    .from("farcaster_notification")
    .select("*")
    .eq("fid", fid)
    .single();

  if (!data) {
    return res.status(404).json({ error: "No token for fid" });
  }

  const payload = {
    notificationId: `test-${Date.now()}`,
    title: "Kimmi Beans 🌱",
    body: "This is a test notification",
    targetUrl: "https://xkimmi.fun",
    tokens: [data.token]
  };

  const resp = await fetch(data.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const json = await resp.json();
  return res.status(200).json(json);
}
