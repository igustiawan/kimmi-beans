import { useEffect, useState } from "react";

export type MintResult = {
  id: number;
  rarity: string;
  image: string;
};

export function useMintStatus(wallet?: `0x${string}`) {
  const [mintResult, setMintResult] = useState<MintResult | null>(null);
  const [mintImageLoading, setMintImageLoading] = useState(false);
  const [preloadedMintImage, setPreloadedMintImage] = useState<string | null>(null);
  const [appLoading, setAppLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkMinted() {
      // WALLET BELUM ADA
      if (!wallet) {
        setMintResult(null);
        setPreloadedMintImage(null);
        setMintImageLoading(false);
        setAppLoading(false);
        return;
      }

      setAppLoading(true);

      try {
        const res = await fetch(`/api/checkMinted?wallet=${wallet}`);
        const data = await res.json();

        if (cancelled) return;

        if (!data.minted) {
          setMintResult(null);
          setPreloadedMintImage(null);
          setMintImageLoading(false);
          setAppLoading(false);
          return;
        }

        const imgUrl: string | null = data.image || null;

        if (!imgUrl) {
          setMintResult({
            id: data.tokenId,
            rarity: data.rarity,
            image: ""
          });
          setPreloadedMintImage(null);
          setMintImageLoading(false);
          setAppLoading(false);
          return;
        }

        // PRELOAD IMAGE
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
          setAppLoading(false);
        };

        img.onerror = () => {
          if (cancelled) return;

          setMintResult({
            id: data.tokenId,
            rarity: data.rarity,
            image: imgUrl
          });
          setPreloadedMintImage(null);
          setMintImageLoading(false);
          setAppLoading(false);
        };
      } catch (err) {
        console.error("checkMinted error", err);
        if (cancelled) return;

        setMintResult(null);
        setPreloadedMintImage(null);
        setMintImageLoading(false);
        setAppLoading(false);
      }
    }

    checkMinted();

    return () => {
      cancelled = true;
    };
  }, [wallet]);

  return {
    mintResult,
    setMintResult,          // ⬅️ penting (dipakai saat mint sukses)
    mintImageLoading,
    preloadedMintImage,
    appLoading
  };
}