import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

type MintResult = {
  id: number;
  rarity: string;
  image: string;
};

export function useMiniAppBoot(wallet?: `0x${string}`) {
  const [booting, setBooting] = useState(true);

  const [userFID, setUserFID] = useState<number | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [pfp, setPfp] = useState<string | null>(null);

  const [mintResult, setMintResult] = useState<MintResult | null>(null);
  const [mintImageLoading, setMintImageLoading] = useState(false);
  const [preloadedMintImage, setPreloadedMintImage] = useState<string | null>(null);

  const hasMinted = Boolean(mintResult);

  // ============================================================
  // 1️⃣ FARCASTER READY — HARUS PALING CEPAT
  // ============================================================
  useEffect(() => {
    (sdk.actions as any).addMiniApp?.();
    sdk.actions.ready();
  }, []);

  // ============================================================
  // 2️⃣ LOAD FID / USER INFO
  // ============================================================
  useEffect(() => {
    let cancelled = false;

    async function loadFID() {
      try {
        const ctx = await sdk.context;
        const user = ctx?.user;
        if (!user || cancelled) return;

        setUserFID(user.fid);
        setDisplayName(user.displayName || null);
        setPfp(user.pfpUrl || null);
      } catch {}
    }

    loadFID();
    return () => {
      cancelled = true;
    };
  }, []);

  // ============================================================
  // 3️⃣ CHECK MINTED + PRELOAD IMAGE
  // ============================================================
  useEffect(() => {
    let cancelled = false;

    async function checkMinted() {
      if (!wallet) {
        setMintResult(null);
        setPreloadedMintImage(null);
        setMintImageLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/checkMinted?wallet=${wallet}`);
        const data = await res.json();

        if (!data.minted || cancelled) {
          setMintResult(null);
          setPreloadedMintImage(null);
          setMintImageLoading(false);
          return;
        }

        const imgUrl = data.image || "";

        if (!imgUrl) {
          setMintResult({
            id: data.tokenId,
            rarity: data.rarity,
            image: ""
          });
          setMintImageLoading(false);
          return;
        }

        setMintImageLoading(true);
        setPreloadedMintImage(null);

        const img = new Image();
        img.src = imgUrl;

        img.onload = () => {
          if (cancelled) return;
          setMintResult({
            id: data.tokenId,
            rarity: data.rarity,
            image: imgUrl
          });
          setPreloadedMintImage(imgUrl);
          setMintImageLoading(false);
        };

        img.onerror = () => {
          if (cancelled) return;
          setMintResult({
            id: data.tokenId,
            rarity: data.rarity,
            image: imgUrl
          });
          setMintImageLoading(false);
        };
      } catch {
        if (!cancelled) {
          setMintResult(null);
          setMintImageLoading(false);
        }
      }
    }

    checkMinted();
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  // ============================================================
  // 4️⃣ BOOT COMPLETE
  // ============================================================
  useEffect(() => {
    // tunggu 1 tick supaya wagmi & state settle
    const t = setTimeout(() => setBooting(false), 0);
    return () => clearTimeout(t);
  }, []);

  return {
    booting,

    userFID,
    displayName,
    pfp,

    hasMinted,
    mintResult,

    mintImageLoading,
    preloadedMintImage,
  };
}