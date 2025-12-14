// ===============================
// 2️⃣ BASESCAN: TX HISTORY (FIXED)
// ===============================
try {
  const url =
    `https://api.basescan.org/api` +
    `?module=account&action=txlist` +
    `&address=${wallet}` +
    `&startblock=0&endblock=99999999` +
    `&page=1&offset=1000&sort=asc` +
    `&apikey=${process.env.BASESCAN_API_KEY}`;

  const txRes = await fetch(url);
  const txJson = await txRes.json();

  // ❗ BaseScan success check
  if (txJson.status !== "1" || !Array.isArray(txJson.result)) {
    console.warn("BaseScan empty or error:", txJson.message);
    return res.status(200).json(result);
  }

  const txs = txJson.result;

  result.totalTx = txs.length;

  if (txs.length === 0) {
    return res.status(200).json(result);
  }

  // ===============================
  // 3️⃣ GROUP BY DAY (UTC)
  // ===============================
  const dayList = [];

  for (const tx of txs) {
    if (!tx.timeStamp) continue;
    const day = new Date(Number(tx.timeStamp) * 1000)
      .toISOString()
      .slice(0, 10);

    if (!dayList.includes(day)) {
      dayList.push(day);
    }
  }

  dayList.sort();
  result.activeDays = dayList.length;

  // ===============================
  // 4️⃣ WALLET AGE
  // ===============================
  const firstTs = Number(txs[0].timeStamp) * 1000;
  result.walletAgeDays = Math.floor(
    (Date.now() - firstTs) / (1000 * 60 * 60 * 24)
  );

  // ===============================
  // 5️⃣ BEST STREAK (BASE ACTIVITY)
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
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  result.bestStreak = best;
} catch (err) {
  console.warn("BaseScan error", err);
}