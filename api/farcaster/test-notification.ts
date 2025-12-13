import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const token = "019b1691-e93e-deb5-8e7a-671fbff43148"; // TOKEN DARI LOG
  const url = "https://api.farcaster.xyz/v1/frame-notifications";

  const payload = {
    notificationId: "test-bean-1",
    title: "Kimmi Beans 🌱",
    body: "This is a test notification for your bean!",
    targetUrl: "https://xkimmi.fun",
    tokens: [token]
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const json = await resp.json();

  return res.status(200).json({
    sent: true,
    farcasterResponse: json
  });
}