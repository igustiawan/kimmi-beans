// /api/identity.js
export default async function handler(req, res) {
  try {
    const { wallet, fid } = req.query;

    if (!wallet) {
      return res.status(400).json({ error: "wallet required" });
    }

    const result = {
      neynarScore: null,
      activeDays: 0,
      walletAgeDays: null,
      totalTx: 0,
      bestStreak: 0
    };

    // ===============================
    // 1️⃣ NEYNAR SCORE
    // ===============================
    if (fid && process.env.NEYNAR_API_KEY) {
      try {
        const neynarRes = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
          {
            headers: {
              accept: "application/json",
              api_key: process.env.NEYNAR_API_KEY
            }
          }
        );

        if (neynarRes.ok) {
          const json = await neynarRes.json();
          const user = json.users?.[0];
          if (user?.score !== undefined) {
            result.neynarScore = user.score;
          }
        }
      } catch (_) {}
    }

    // ===============================
    // 2️⃣ ALCHEMY BASE ACTIVITY
    // ===============================
    const ALCHEMY_URL =
      `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_BASE_API_KEY}`;

    let pageKey = null;
    const daySet = new Set();
    const dayList = [];

    do {
      const rpcRes = await fetch(ALCHEMY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "alchemy_getAssetTransfers",
          params: [{
            fromBlock: "0x0",
            toBlock: "latest",
            fromAddress: wallet,
            category: ["external", "erc20", "erc721", "erc1155"],
            withMetadata: true,
            maxCount: "0x3e8", // 1000
            pageKey
          }]
        })
      });

      const json = await rpcRes.json();
      const transfers = json?.result?.transfers || [];

      result.totalTx += transfers.length;

      for (const tx of transfers) {
        if (!tx.metadata?.blockTimestamp) continue;

        const day = new Date(tx.metadata.blockTimestamp)
          .toISOString()
          .slice(0, 10);

        if (!daySet.has(day)) {
          daySet.add(day);
          dayList.push(day);
        }
      }

      pageKey = json?.result?.pageKey || null;
    } while (pageKey && dayList.length < 365); // hard cap safety

    if (dayList.length === 0) {
      return res.status(200).json(result);
    }

    // ===============================
    // 3️⃣ METRICS
    // ===============================
    dayList.sort();
    result.activeDays = dayList.length;

    const firstDayTs = new Date(dayList[0]).getTime();
    result.walletAgeDays = Math.floor(
      (Date.now() - firstDayTs) / (1000 * 60 * 60 * 24)
    );

    let best = 1;
    let current = 1;

    for (let i = 1; i < dayList.length; i++) {
      const prev = new Date(dayList[i - 1]);
      const curr = new Date(dayList[i]);

      const diff =
        (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

      if (diff === 1) {
        current++;
        best = Math.max(best, current);
      } else {
        current = 1;
      }
    }

    result.bestStreak = best;

    return res.status(200).json(result);
  } catch (err) {
    console.error("identity api error", err);
    return res.status(500).json({ error: "internal_error" });
  }
}