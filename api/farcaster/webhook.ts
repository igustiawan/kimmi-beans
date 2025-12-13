import {
  saveNotificationToken,
  removeNotificationToken
} from "./notificationStore";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405 }
    );
  }

  const event = await req.json();

  console.log("[FARCASTER WEBHOOK]", JSON.stringify(event, null, 2));

  if (event.notificationDetails) {
    const { token, url } = event.notificationDetails;
    const fid = event.fid;

    await saveNotificationToken({ fid, token, url });

    console.log("SAVE TOKEN", { fid, token });
  }

  if (
    event.event === "miniapp_removed" ||
    event.event === "notifications_disabled"
  ) {
    await removeNotificationToken(event.fid);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}