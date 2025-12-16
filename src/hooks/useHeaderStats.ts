import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import careAbi from "../abi/kimmiBeansCare.json";

type StatsStruct = {
  xp: bigint;
  level: bigint;
  beans: bigint;
  lastAction: bigint;
};

export function useHeaderStats(wallet?: `0x${string}`) {
  const CONTRACT = import.meta.env.VITE_BEAN_CONTRACT as `0x${string}`;

  const [dailyBeans, setDailyBeans] = useState(0);
  const [lifetimeXp, setLifetimeXp] = useState(0);
  const [lifetimeLevel, setLifetimeLevel] = useState(0);

  const {
    data,
    refetch,
    isFetched
  } = useReadContract({
    address: CONTRACT,
    abi: careAbi,
    functionName: "getStats",
    args: wallet ? [wallet] : undefined,
    query: { enabled: Boolean(wallet) }
  });

  useEffect(() => {
    if (!data) return;

    const stats = data as StatsStruct;

    setLifetimeXp(Number(stats.xp));
    setDailyBeans(Number(stats.beans));
    setLifetimeLevel(Number(stats.level));
  }, [data]);

  return {
    dailyBeans,
    lifetimeXp,
    lifetimeLevel,
    refreshHeaderStats: refetch,
    ready: isFetched
  };
}