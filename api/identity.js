// ===============================
// 2️⃣ BASE RPC ACTIVITY (FREE)
// ===============================
const RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";

try {
  // get latest block
  const latestBlockRes = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_blockNumber",
      params: []
    })
  });

  const latestBlockHex = (await latestBlockRes.json()).result;
  const latestBlock = parseInt(latestBlockHex, 16);

  const BLOCK_RANGE = 5000; // safe range
  const fromBlock = Math.max(latestBlock - BLOCK_RANGE, 0);

  // get tx logs involving wallet
  const logsRes = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "eth_getLogs",
      params: [{
        fromBlock: "0x" + fromBlock.toString(16),
        toBlock: "latest",
        address: wallet
      }]
    })
  });

  const logs = (await logsRes.json()).result || [];

  result.totalTx = logs.length;

  if (logs.length === 0) {
    return res.status(200).json(result);
  }

  const daySet = new Set();
  const dayList = [];

  for (const log of logs) {
    if (!log.blockNumber) continue;

    const blockRes = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "eth_getBlockByNumber",
        params: [log.blockNumber, false]
      })
    });

    const block = (await blockRes.json()).result;
    if (!block?.timestamp) continue;

    const day = new Date(parseInt(block.timestamp, 16) * 1000)
      .toISOString()
      .slice(0, 10);

    if (!daySet.has(day)) {
      daySet.add(day);
      dayList.push(day);
    }
  }

  dayList.sort();
  result.activeDays = dayList.length;

  const firstDayTs = new Date(dayList[0]).getTime();
  result.walletAgeDays = Math.floor(
    (Date.now() - firstDayTs) / (1000 * 60 * 60 * 24)
  );

  // best streak
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
  console.warn("Base RPC activity error", err);
}