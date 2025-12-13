import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // WAJIB POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const event = req.body;

  console.log("[FARCASTER WEBHOOK]", JSON.stringify(event, null, 2));

  /**
   * event.event bisa:
   * - miniapp_added
   * - miniapp_removed
   * - notifications_enabled
   * - notifications_disabled
   *
   * event.fid => number
   *
   * event.notificationDetails = {
   *   token: string,
   *   url: string
   * }
   */

  if (event?.notificationDetails) {
    const { token, url } = event.notificationDetails;
    const fid = event.fid;

    // TODO: simpan ke DB
    console.log("SAVE TOKEN", { fid, token, url });
  }

  if (
    event?.event === "miniapp_removed" ||
    event?.event === "notifications_disabled"
  ) {
    const fid = event.fid;

    // TODO: hapus token
    console.log("REMOVE TOKEN FOR FID", fid);
  }

  // ⚠️ WAJIB BALIK 200
  return res.status(200).json({ ok: true });
}