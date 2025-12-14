// api/identity.js

export default async function handler(req, res) {
  try {
    const { wallet, fid } = req.query;

    if (!wallet || !fid) {
      return res.status(400).json({ error: "wallet and fid are required" });
    }

    const result = {
      neynarScore: null,
      activeDays: null,
      walletAgeDays: null,
      totalTx: null,
      bestStreak: null
    };

    // ===============================
    // 1️⃣ NEYNAR: score + active days
    // ===============================
    try {
      const neynarRes = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
        {
          headers: {
            "accept": "application/json",
            "api_key": process.env.NEYNAR_API_KEY
          }
        }
      );

      if (neynarRes.ok) {
        const json = await neynarRes.json();
        const user = json.users?.[0];

        if (user) {
          result.neynarScore = user.score ?? null;

          // active days (fallback jika field beda)
          if (typeof user.active_days === "number") {
            result.activeDays = user.active_days;
          } else if (Array.isArray(user.activity?.days)) {
            result.activeDays = user.activity.days.length;
          }
        }
      }
    } catch (err) {
      console.warn("Neynar fetch failed", err);
    }

    // =====================================
    // 2️⃣ BASE RPC: wallet age + total tx
    // =====================================
    try {
      const rpcUrl = process.env.BASE_RPC_URL;

      // --- get first tx (wallet age) ---
      const firstTxRes = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getTransactionCount",
          params: [wallet, "earliest"]
        })
      });

      if (firstTxRes.ok) {
        // NOTE:
        // eth_getTransactionCount(earliest) = tx count at genesis
        // we use heuristic: if > 0, wallet existed since early block
        // 👉 lebih akurat pakai explorer, tapi ini cukup untuk miniapp
      }

      // --- total tx count (latest nonce) ---
      const nonceRes = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "eth_getTransactionCount",
          params: [wallet, "latest"]
        })
      });

      if (nonceRes.ok) {
        const json = await nonceRes.json();
        const nonceHex = json.result;
        result.totalTx = parseInt(nonceHex, 16);
      }

      // --- wallet age (approx via first tx block) ---
      const firstTxBlockRes = await fetch(
        `https://api.basescan.org/api?module=account&action=txlist&address=${wallet}&startblock=0&endblock=99999999&page=1&offset=1&sort=asc`
      );

      if (firstTxBlockRes.ok) {
        const json = await firstTxBlockRes.json();
        const tx = json.result?.[0];

        if (tx?.timeStamp) {
          const firstTs = Number(tx.timeStamp) * 1000;
          const days =
            Math.floor((Date.now() - firstTs) / (1000 * 60 * 60 * 24));
          result.walletAgeDays = days;
        }
      }
    } catch (err) {
      console.warn("Base RPC failed", err);
    }

    // =====================================
    // 3️⃣ BEST STREAK (OFF-CHAIN LOGIC)
    // =====================================
    try {
      // TODO:
      // Idealnya ambil dari DB kamu (action history)
      // Sementara fallback heuristic:
      if (result.activeDays) {
        result.bestStreak = Math.min(
          Math.floor(result.activeDays / 8),
          result.activeDays
        );
      }
    } catch (err) {
      console.warn("streak calc failed", err);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("identity api error", err);
    return res.status(500).json({ error: "internal_error" });
  }
}