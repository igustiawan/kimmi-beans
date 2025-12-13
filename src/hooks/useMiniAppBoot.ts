import { useEffect, useRef, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

export function useMiniAppBoot(wallet?: `0x${string}`) {
  const readyCalled = useRef(false);

  const [booting, setBooting] = useState(true);

  const [userFID, setUserFID] = useState<number | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [pfp, setPfp] = useState<string | null>(null);

  const [mintResult, setMintResult] = useState<any>(null);
  const [mintImageLoading, setMintImageLoading] = useState(false);
  const [preloadedMintImage, setPreloadedMintImage] = useState<string | null>(null);

  const hasMinted = Boolean(mintResult);

  // ✅ SDK READY — GUARDED
  useEffect(() => {
    if (readyCalled.current) return;
    readyCalled.current = true;

    try {
      (sdk.actions as any).addMiniApp?.();
      sdk.actions.ready();
    } catch {
      console.warn("sdk.ready already called");
    }
  }, []);

  // load FID
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const ctx = await sdk.context;
        if (!ctx?.user || cancelled) return;

        setUserFID(ctx.user.fid);
        setDisplayName(ctx.user.displayName || null);
        setPfp(ctx.user.pfpUrl || null);
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // check minted
  useEffect(() => {
    let cancelled = false;

    async function run() {
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
          return;
        }

        const img = data.image ? new Image() : null;
        if (img) {
        setMintImageLoading(true);
        img.src = data.image;

        img.onload = () => {
            if (cancelled) return;
            setMintResult(data);
            setPreloadedMintImage(data.image);
            setMintImageLoading(false);
        };

        img.onerror = () => {
            if (cancelled) return;
            setMintResult(data);
            setPreloadedMintImage(null);
            setMintImageLoading(false);
        };
        }
        else {
          setMintResult(data);
        }
      } catch {}
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  // finish boot
    useEffect(() => {
    if (userFID !== null && wallet !== undefined) {
        setBooting(false);
    }
    }, [userFID, wallet]);

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
