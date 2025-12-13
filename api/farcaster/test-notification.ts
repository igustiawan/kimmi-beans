import { getNotificationToken 
    } from "/farcaster/kimmi-beans/api/farcaster/notificationStore";

export default async function handler(): Promise<Response> {
  const fid = 1; // TEST

  const data = await getNotificationToken(fid);

  if (!data) {
    return new Response(
      JSON.stringify({ error: "No token for fid" }),
      { status: 404 }
    );
  }

  const payload = {
    notificationId: `test-${Date.now()}`,
    title: "Kimmi Beans 🌱",
    body: "This is a test notification for your bean!",
    targetUrl: "https://xkimmi.fun",
    tokens: [data.token]
  };

  const resp = await fetch(data.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const json = await resp.json();

  return new Response(JSON.stringify(json), { status: 200 });
}