// /api/insights.js
// Node (Next/Vercel-style) serverless endpoint — plain JS

import { ethers } from "ethers";
import careAbi from "../abi/kimmiBeansCare.json"; // adjust path if needed

export default async function handler(req, res) {
  try {
    const wallet = (req.query.wallet || req.body?.wallet || "").toString().trim().toLowerCase();
    if (!wallet || !ethers.utils.isAddress(wallet)) {
      return res.status(400).json({ error: "Missing or invalid wallet query param (use ?wallet=0x...)" });
    }

    const RPC_URL = process.env.RPC_URL;
    const CONTRACT_ADDR = (process.env.BEAN_CONTRACT || process.env.VITE_BEAN_CONTRACT);
    const FROM_BLOCK = Number(process.env.INSIGHTS_FROM_BLOCK || 0);

    if (!RPC_URL) return res.status(500).json({ error: "RPC_URL not configured on server" });
    if (!CONTRACT_ADDR) return res.status(500).json({ error: "BEAN_CONTRACT not configured on server" });

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDR, careAbi, provider);

    // 1) read on-chain current stats via getStats
    let onChainStats;
    try {
      const raw = await contract.getStats(wallet);
      // raw is tuple: { xp, level, beans, lastAction }
      onChainStats = {
        xp: raw.xp ? raw.xp.toString() : "0",
        level: raw.level ? raw.level.toString() : "0",
        beans: raw.beans ? raw.beans.toString() : "0",
        lastAction: raw.lastAction ? Number(raw.lastAction) : null,
      };
    } catch (err) {
      // bubble a clearer message
      console.warn("getStats read failed:", err && err.message ? err.message : err);
      return res.status(502).json({ error: "Failed reading getStats from chain", detail: String(err?.message || err) });
    }

    // 2) query ActionPerformed events for this user (indexed user address)
    // filter by user indexed param (first indexed)
    const filter = contract.filters.ActionPerformed(wallet, null, null, null, null, null, null);
    // Use fromBlock to limit scan
    let events = [];
    try {
      events = await contract.queryFilter(filter, FROM_BLOCK, "latest");
    } catch (err) {
      console.warn("queryFilter failed:", err && err.message ? err.message : err);
      return res.status(502).json({ error: "Failed querying events", detail: String(err?.message || err) });
    }

    // If no events, return zeros
    if (!events || events.length === 0) {
      return res.status(200).json({
        daily: { feed: 0, water: 0, train: 0, beans: 0, xp: 0 },
        total: { feed: 0, water: 0, train: 0, beans: onChainStats.beans || 0, xp: onChainStats.xp || 0, level: onChainStats.level || 0 },
        onChainStats
      });
    }

    // We need to map events to timestamps: fetch blocks in batch (unique blockNumbers)
    const blockNumbers = Array.from(new Set(events.map(e => e.blockNumber)));
    const blockMap = {};
    // fetch in parallel, but be friendly (Promise.all)
    await Promise.all(blockNumbers.map(async (bn) => {
      try {
        const b = await provider.getBlock(bn);
        blockMap[bn] = b ? b.timestamp : null;
      } catch (err) {
        blockMap[bn] = null;
      }
    }));

    // Determine "today" range (UTC): start of current UTC day (00:00:00)
    const now = Math.floor(Date.now() / 1000);
    const utcDate = new Date(); // local machine time, we'll compute UTC midnight
    const utcYear = utcDate.getUTCFullYear();
    const utcMonth = utcDate.getUTCMonth();
    const utcDay = utcDate.getUTCDate();
    const utcMidnight = Math.floor(Date.UTC(utcYear, utcMonth, utcDay) / 1000); // seconds

    // accumulate totals
    const totals = { feed: 0, water: 0, train: 0, beans: 0, xp: 0 };
    const daily = { feed: 0, water: 0, train: 0, beans: 0, xp: 0 };

    for (const ev of events) {
      try {
        const args = ev.args;
        // args: (user indexed), actionType (string), xpGained, beansGained, newXp, newLevel, newBeans
        const actionType = args?.actionType ? args.actionType.toString() : "";
        const xpGained = args?.xpGained ? Number(args.xpGained.toString()) : 0;
        const beansGained = args?.beansGained ? Number(args.beansGained.toString()) : 0;

        // classify action by actionType upper-case
        const at = (actionType || "").toUpperCase?.() || "";

        if (at === "FEED") totals.feed++;
        else if (at === "WATER") totals.water++;
        else if (at === "TRAIN") totals.train++;

        totals.beans += beansGained;
        totals.xp += xpGained;

        // timestamp
        const ts = blockMap[ev.blockNumber] || null;
        if (ts && ts >= utcMidnight) {
          // event happened today (UTC)
          if (at === "FEED") daily.feed++;
          else if (at === "WATER") daily.water++;
          else if (at === "TRAIN") daily.train++;

          daily.beans += beansGained;
          daily.xp += xpGained;
        }
      } catch (err) {
        // ignore per-event errors but log
        console.warn("event parse failed:", err && err.message ? err.message : err);
      }
    }

    // respond
    return res.status(200).json({
      daily,
      total: {
        feed: totals.feed,
        water: totals.water,
        train: totals.train,
        beans: totals.beans.toString(),
        xp: totals.xp.toString(),
        level: onChainStats.level
      },
      onChainStats,
      meta: {
        eventsScanned: events.length,
        fromBlock: FROM_BLOCK
      }
    });

  } catch (err) {
    console.error("insights server error:", err);
    return res.status(500).json({ error: "Server error", detail: String(err?.message || err) });
  }
}
