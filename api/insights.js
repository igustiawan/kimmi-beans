// pages/api/insights.js
const { ethers } = require("ethers");

const RPC_URL = process.env.RPC_URL;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

if (!RPC_URL) console.warn("RPC_URL not set");
if (!CONTRACT_ADDRESS) console.warn("CONTRACT_ADDRESS not set");

// Minimal ABI: getStats + ActionPerformed event (we only need these)
const CARE_ABI = [
  "function getStats(address user) view returns (uint256 xp, uint256 level, uint256 beans, uint256 lastAction)",
  "event ActionPerformed(address indexed user, string actionType, uint256 xpGained, uint256 beansGained, uint256 newXp, uint256 newLevel, uint256 newBeans)"
];

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

// binary search block by timestamp (seconds)
async function findBlockByTimestamp(targetTs) {
  const latest = await provider.getBlockNumber();
  let low = 0;
  let high = latest;

  const lowBlock = await provider.getBlock(low);
  const highBlock = await provider.getBlock(high);
  if (!lowBlock || !highBlock) return 0;

  if (targetTs <= lowBlock.timestamp) return low;
  if (targetTs >= highBlock.timestamp) return high;

  while (low + 1 < high) {
    const mid = Math.floor((low + high) / 2);
    const midBlock = await provider.getBlock(mid);
    if (!midBlock) {
      high = mid;
      continue;
    }
    if (midBlock.timestamp === targetTs) return mid;
    if (midBlock.timestamp < targetTs) low = mid;
    else high = mid;
  }
  return high;
}

module.exports = async function handler(req, res) {
  try {
    const wallet = (req.query.wallet || "").toString().trim();
    if (!wallet || !ethers.utils.isAddress(wallet)) {
      return res.status(400).json({ error: "Invalid or missing wallet query param" });
    }

    const contract = new ethers.Contract(CONTRACT_ADDRESS, CARE_ABI, provider);

    // 1) fetch totals from getStats
    let totalXp = 0;
    let totalLevel = 0;
    let totalBeans = 0;
    try {
      const st = await contract.getStats(wallet);
      totalXp = st && st.xp ? Number(st.xp.toString()) : 0;
      totalLevel = st && st.level ? Number(st.level.toString()) : 0;
      totalBeans = st && st.beans ? Number(st.beans.toString()) : 0;
    } catch (err) {
      console.warn("getStats failed:", err?.message || err);
    }

    // 2) compute start-of-day UTC timestamp (seconds)
    const now = new Date();
    const startOfDayUtc = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000);

    // 3) find block at startOfDayUtc
    const startBlock = await findBlockByTimestamp(startOfDayUtc);
    const latestBlock = await provider.getBlockNumber();

    // 4) prepare iface & event topic
    const iface = new ethers.utils.Interface(CARE_ABI);
    const eventTopic = iface.getEventTopic("ActionPerformed");

    // topic[1] is indexed user (address padded to 32 bytes)
    const userTopic = ethers.utils.hexZeroPad(wallet.toLowerCase(), 32);

    // 5) get logs in startOfDay..latest
    let logs = [];
    try {
      logs = await provider.getLogs({
        address: CONTRACT_ADDRESS,
        fromBlock: startBlock,
        toBlock: latestBlock,
        topics: [eventTopic, userTopic]
      });
    } catch (err) {
      console.warn("getLogs (day range) failed:", err?.message || err);
      // fallback attempt (may be heavy)
      try {
        logs = await provider.getLogs({
          address: CONTRACT_ADDRESS,
          fromBlock: 0,
          toBlock: latestBlock,
          topics: [eventTopic, userTopic]
        });
      } catch (err2) {
        console.warn("fallback getLogs failed:", err2?.message || err2);
        logs = [];
      }
    }

    // 6) parse logs for daily counts
    let dailyFeed = 0;
    let dailyWater = 0;
    let dailyTrain = 0;
    let dailyBeansGained = 0;
    let dailyXpGained = 0;

    for (const log of logs) {
      try {
        const parsed = iface.parseLog(log);
        const actionType = parsed.args.actionType ? parsed.args.actionType.toString() : "";
        const xpGainedBN = parsed.args.xpGained;
        const beansGainedBN = parsed.args.beansGained;

        const xpGained = xpGainedBN ? Number(xpGainedBN.toString()) : 0;
        const beansGained = beansGainedBN ? Number(beansGainedBN.toString()) : 0;

        const key = (actionType || "").toUpperCase();
        if (key === "FEED") dailyFeed++;
        else if (key === "WATER") dailyWater++;
        else if (key === "TRAIN") dailyTrain++;

        dailyBeansGained += beansGained;
        dailyXpGained += xpGained;
      } catch (err) {
        // ignore parse errors
        console.warn("parseLog failed:", err?.message || err);
      }
    }

    // 7) lifetime action counts: try to fetch ALL logs for this user and count each type
    let lifetimeFeed = 0;
    let lifetimeWater = 0;
    let lifetimeTrain = 0;
    try {
      const logsAll = await provider.getLogs({
        address: CONTRACT_ADDRESS,
        fromBlock: 0,
        toBlock: latestBlock,
        topics: [eventTopic, userTopic]
      });

      for (const log of logsAll) {
        try {
          const parsed = iface.parseLog(log);
          const key = (parsed.args.actionType || "").toUpperCase();
          if (key === "FEED") lifetimeFeed++;
          else if (key === "WATER") lifetimeWater++;
          else if (key === "TRAIN") lifetimeTrain++;
        } catch (e) {
          // ignore
        }
      }
    } catch (err) {
      console.warn("fetching all logs for lifetime failed (provider may restrict large range):", err?.message || err);
      // leave lifetime counts as 0
    }

    const response = {
      daily: {
        feed: dailyFeed,
        water: dailyWater,
        train: dailyTrain,
        beans: dailyBeansGained,
        xp: dailyXpGained,
        startOfDayTs: startOfDayUtc,
        scannedFromBlock: startBlock,
        scannedToBlock: latestBlock
      },
      total: {
        feed: lifetimeFeed,
        water: lifetimeWater,
        train: lifetimeTrain,
        beans: totalBeans,
        xp: totalXp,
        level: totalLevel
      }
    };

    return res.status(200).json(response);
  } catch (err) {
    console.error("insights API error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
};