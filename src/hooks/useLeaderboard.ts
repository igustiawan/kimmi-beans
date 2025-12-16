import { useEffect, useState } from "react";

export type Player = {
  wallet: `0x${string}`;
  username?: string;
};

export function useLeaderboard(tab: string) {
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      setLeaderboard((data.leaderboard || []) as Player[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "rank") load();
  }, [tab]);

  return { leaderboard, loading, refresh: load };
}