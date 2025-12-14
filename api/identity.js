// api/identity.js

export default async function handler(req, res) {
  try {
    const { wallet, fid } = req.query;

    if (!wallet) {
      return res.status(400).json({ error: "wallet is required" });
    }

    const result = {
      neynarScore: null,
      activeDays: 0,
      walletAgeDays: null,
      totalTx: 0,
      bestStreak: 0
    };

    // ===============================
    // 1️⃣ NEYNAR SCORE (OPTIONAL)
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
      } catch (err) {
        console.warn("Neynar error", err);
      }
    }

    // ===============================
    // 2️⃣ BASESCAN: TX HISTORY
    // ===============================
    try {
      const url =
        `https://api.basescan.org/api` +
        `?module=account&action=txlist` +
        `&address=${wallet}` +
        `&startblock=0&endblock=99999999` +
        `&page=1&offset=1000&sort=asc`;

      const txRes = await fetch(url);
      const txJson = await txRes.json();

      const txs = Array.isArray(txJson.result) ? txJson.result : [];

      result.totalTx = txs.length;

      if (txs.length === 0) {
        return res.status(200).json(result);
      }

      // ===============================
      // 3️⃣ GROUP BY DAY (UTC)
      // ===============================
      const daysSet = new Set();
      const dayList = [];

      for (const tx of txs) {
        if (!tx.timeStamp) continue;
        const day = new Date(Number(tx.timeStamp) * 1000)
          .toISOString()
          .slice(0, 10); // YYYY-MM-DD

        if (!daysSet.has(day)) {
          daysSet.add(day);
          dayList.push(day);
        }
      }

      // sort ascending
      dayList.sort();

      result.activeDays = dayList.length;

      // ===============================
      // 4️⃣ WALLET AGE
      // ===============================
      const firstDay = dayList[0];
      const firstTs = new Date(firstDay).getTime();
      result.walletAgeDays = Math.floor(
        (Date.now() - firstTs) / (1000 * 60 * 60 * 24)
      );

      // ===============================
      // 5️⃣ BEST STREAK (CORE FIX)
      // ===============================
      let best = 1;
      let current = 1;

      for (let i = 1; i < dayList.length; i++) {
        const prev = new Date(dayList[i - 1]);
        const curr = new Date(dayList[i]);

        const diff =
          (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

        if (diff === 1) {
          current++;
          if (current > best) best = current;
        } else {
          current = 1;
        }
      }

      result.bestStreak = best;
    } catch (err) {
      console.warn("BaseScan error", err);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("identity api fatal", err);
    return res.status(500).json({ error: "internal_error" });
  }
}