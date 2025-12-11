// src/hooks/useDaily.ts
import { useCallback, useEffect, useState } from "react";
import type { DailySummary } from "../types";

export function useDaily(
  wallet: string | null | undefined,
  displayName?: string | null,
  lifetimeXp?: number,
  dailyBeans?: number
) {
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyToast, setDailyToast] = useState<string | null>(null);
  const [dailySummary, setDailySummary] = useState<DailySummary>({});
  const [canInteract, setCanInteract] = useState(false);
  const [hasBeanStats, setHasBeanStats] = useState(false);

  const fetchDailyStatus = useCallback(async () => {
    if (!wallet) {
      setDailySummary({});
      setCanInteract(false);
      setHasBeanStats(false);
      return;
    }

    setDailyLoading(true);
    try {
      const res = await fetch(`/api/dailyStatus?wallet=${wallet}`);
      if (!res.ok) throw new Error("no daily API");
      const data = await res.json();

      const userExists = Boolean(data.user);
      setHasBeanStats(userExists);

      if (userExists) {
        setDailySummary({
          level: Number(data.user.level ?? 0),
          beans: Number(data.user.beans ?? 0),
          rank: data.userRank ?? null,
          username: data.user.username ?? null,
        });
      } else {
        setDailySummary({
          level: undefined,
          beans: dailyBeans ?? 0,
          rank: null,
          username: displayName ?? null,
        });
      }

      if (typeof data.can_interact === "boolean") {
        setCanInteract(data.can_interact);
      } else if (data.last_shared_date) {
        const last = new Date(data.last_shared_date);
        const now = new Date();
        const lastDay = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate());
        const todayDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        setCanInteract(lastDay === todayDay);
      } else {
        setCanInteract(false);
      }
    } catch (err) {
      console.warn("fetchDailyStatus failed", err);
      setDailySummary({ level: undefined, beans: dailyBeans ?? 0, rank: null, username: displayName ?? null });
      setCanInteract(false);
      setHasBeanStats(false);
    } finally {
      setDailyLoading(false);
    }
  }, [wallet, displayName, dailyBeans]);

  useEffect(() => {
    // auto-run on wallet change
    fetchDailyStatus();
  }, [fetchDailyStatus]);

  async function markSharedOptimistic(fid?: number | null) {
    if (!wallet) {
      setDailyToast("Connect wallet first");
      setTimeout(() => setDailyToast(null), 2000);
      return;
    }

    setDailyLoading(true);
    try {
      const res = await fetch("/api/markShared", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, fid }),
      });

      if (!res.ok) {
        setCanInteract(true);
        setDailyToast("Shared! (backend not available)");
        setTimeout(() => setDailyToast(null), 1800);
        return;
      }

      await res.json();
      setCanInteract(true);
      setDailyToast("Berhasil! Aksi harian sudah dibuka.");
      setTimeout(() => setDailyToast(null), 1500);
      await fetchDailyStatus();
    } catch (err) {
      console.warn("markShared error", err);
      setCanInteract(true); // optimistic fallback
      setDailyToast("Shared! (offline fallback)");
      setTimeout(() => setDailyToast(null), 1500);
    } finally {
      setDailyLoading(false);
    }
  }

  return {
    dailyLoading,
    dailyToast,
    setDailyToast,
    dailySummary,
    canInteract,
    hasBeanStats,
    fetchDailyStatus,
    markSharedOptimistic,
  };
}
