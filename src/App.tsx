// src/App.tsx
import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect, useReadContract } from "wagmi";
import MintButton from "./components/MintButton";
import EvolutionPanel from "./components/EvolutionPanel";
import careAbi from "./abi/kimmiBeansCare.json";

type Tab = "mint" | "bean" | "rank" | "faq" | "daily";
const DEV_FID = 299929; // only this FID can access Daily for now
const MINI_APP_URL = "https://farcaster.xyz/miniapps/VV7PYCDPdD04/kimmi-beans";

export default function App() {
  const [tab, setTab] = useState<Tab>("mint");

  const [userFID, setUserFID] = useState<number | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [pfp, setPfp] = useState<string | null>(null);

  const [mintResult, setMintResult] = useState<{
    id: number;
    rarity: string;
    image: string;
  } | null>(null);

  const [soldOut, setSoldOut] = useState(false);
  const [totalMinted, setTotalMinted] = useState(0);

  const MAX_SUPPLY = 10000;

  const { isConnected, address: wallet } = useAccount();
  const { connect, connectors } = useConnect();

  const CONTRACT = import.meta.env.VITE_BEAN_CONTRACT as `0x${string}`;

  // Header values
  const [dailyBeans, setDailyBeans] = useState(0);
  const [lifetimeXp, setLifetimeXp] = useState(0);

  // STATE UNTUK LEADERBOARD
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingRank, setLoadingRank] = useState(false);

  // DAILY simple state
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyToast, setDailyToast] = useState<string | null>(null);

  // dailySummary: level, beans, rank, username
  const [dailySummary, setDailySummary] = useState<{
    level?: number;
    beans?: number;
    rank?: number | null;
    username?: string | null;
  }>({});

  // FEATURE GATING: apakah user sudah "shared" hari ini dan boleh interaksi?
  const [canInteract, setCanInteract] = useState<boolean>(false);

  // apakah row bean_stats untuk wallet ini ada di DB
  const [hasBeanStats, setHasBeanStats] = useState<boolean>(false);

  // LOAD LEADERBOARD (top 100)
  useEffect(() => {
    if (tab !== "rank") return;
    (async function loadRank() {
      setLoadingRank(true);
      try {
        const res = await fetch("/api/leaderboard");
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
      } catch (err) {
        console.error("Failed to load leaderboard", err);
        setLeaderboard([]);
      } finally {
        setLoadingRank(false);
      }
    })();
  }, [tab]);

  // ============================================================
  // Load FID
  // ============================================================
  useEffect(() => {
    sdk.actions.ready();
    (async function loadFID() {
      const ctx = await sdk.context;
      const user = ctx?.user;
      if (user) {
        setUserFID(user.fid);
        setDisplayName(user.displayName || null);
        setPfp(user.pfpUrl || null);
      }
    })();
  }, []);

  // ============================================================
  // Check minted NFT
  // ============================================================
  useEffect(() => {
    (async function checkMinted() {
      if (!wallet) return;
      try {
        const res = await fetch(`/api/checkMinted?wallet=${wallet}`);
        const data = await res.json();
        if (data.minted) {
          setMintResult({
            id: data.tokenId,
            rarity: data.rarity,
            image: data.image
          });
        } else {
          setMintResult(null);
        }
      } catch (err) {
        console.error("checkMinted error", err);
      }
    })();
  }, [wallet]);

  // ============================================================
  // Auto-load stats for header directly from CONTRACT
  // ============================================================
  type StatsStruct = {
    xp: bigint;
    level: bigint;
    beans: bigint;
    lastAction: bigint;
  };

  const { data: headerStatsRaw, refetch: refetchHeaderStats } = useReadContract({
    address: CONTRACT,
    abi: careAbi,
    functionName: "getStats",
    args: wallet ? [wallet] : undefined,
    query: { enabled: Boolean(wallet) }
  });

  useEffect(() => {
    if (!headerStatsRaw) return;
    const stats = headerStatsRaw as StatsStruct;
    setLifetimeXp(Number(stats.xp));
    setDailyBeans(Number(stats.beans));
  }, [headerStatsRaw]);

  function handleStatsUpdate(newXp: number, newBeans: number) {
    setLifetimeXp(newXp);
    setDailyBeans(newBeans);
    refetchHeaderStats();
  }

  // ============================================================
  // Load supply
  // ============================================================
  useEffect(() => {
    (async function loadSupply() {
      try {
        const res = await fetch("/api/checkSupply");
        const data = await res.json();
        setTotalMinted(data.totalMinted);
        setSoldOut(data.soldOut);
      } catch (err) {
        console.error("loadSupply error", err);
      }
    })();

    const interval = setInterval(() => {
      (async function loadSupplyInterval() {
        try {
          const res = await fetch("/api/checkSupply");
          const data = await res.json();
          setTotalMinted(data.totalMinted);
          setSoldOut(data.soldOut);
        } catch (err) {}
      })();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // ============================================================
  // DAILY: fetch summary and gating info from backend
  //  - expects backend /api/dailyStatus?wallet=... to return:
  //    { user?, userRank?, can_interact?: boolean, last_shared_date?: string }
  // ============================================================
  async function fetchDailyStatus() {
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

      // apakah ada row di bean_stats?
      const userExists = Boolean(data.user);
      setHasBeanStats(userExists);

      // dailySummary from leaderboard
      if (userExists) {
        setDailySummary({
          level: Number(data.user.level ?? 0),
          beans: Number(data.user.beans ?? 0),
          rank: data.userRank ?? null,
          username: data.user.username ?? null
        });
      } else {
        setDailySummary({
          level: undefined,
          beans: dailyBeans,
          rank: null,
          username: displayName || null
        });
      }

      // gating info: can_interact preferred, otherwise derive from last_shared_date
      if (typeof data.can_interact === "boolean") {
        setCanInteract(data.can_interact);
      } else if (data.last_shared_date) {
        // derive: true if last_shared_date is today (UTC)
        const last = new Date(data.last_shared_date);
        const now = new Date();
        const lastDay = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate());
        const todayDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        setCanInteract(lastDay === todayDay);
      } else {
        setCanInteract(false);
      }
    } catch (err) {
      console.warn("dailyStatus fetch failed, using fallback", err);
      setDailySummary({ level: undefined, beans: dailyBeans, rank: null, username: displayName || null });
      setCanInteract(false);
      setHasBeanStats(false);
    } finally {
      setDailyLoading(false);
    }
  }

  useEffect(() => {
    if (tab !== "daily" && tab !== "bean") return; // update when visiting bean or daily (so My Bean shows correct gating)
    fetchDailyStatus();
  }, [tab, wallet, userFID, dailyBeans, displayName]);

  // ============================================================
  // Share to Cast (used by mint flow)
  // ============================================================
  async function shareToCast(tokenId: number, rarity: string, extraMsg?: string) {
    const msg = `I just minted Kimmi Bean #${tokenId} — Rarity: ${rarity} 🫘✨${extraMsg ? " — " + extraMsg : ""}`;
    await sdk.actions.openUrl({
      url:
        `https://warpcast.com/~/compose?text=${encodeURIComponent(msg)}` +
        `&embeds[]=${encodeURIComponent(MINI_APP_URL)}`
    });
  }

  // ============================================================
  // Handle share + markShared (optimistic)
  //  - open warpcast composer
  //  - call /api/markShared to set server-side can_interact / last_shared_date
  // ============================================================
  async function handleShareProgress() {
    if (!wallet) {
      setDailyToast("Connect wallet first");
      setTimeout(() => setDailyToast(null), 2000);
      return;
    }

    setDailyLoading(true);

    // 1) open composer (best-effort)
    try {
      const lvl = dailySummary.level ?? Math.floor(lifetimeXp / 100);
      const beans = dailySummary.beans ?? dailyBeans;
      const rankText = dailySummary.rank ? `#${dailySummary.rank}` : "Not ranked";
      const usernameText = dailySummary.username || displayName || wallet;
      const msg = `${usernameText} — Kimmi Bean progress: Lvl ${lvl} • 🫘 ${beans} • ${rankText} — main di Kimmi Beans! ${MINI_APP_URL}`;

      await sdk.actions.openUrl({
        url: `https://warpcast.com/~/compose?text=${encodeURIComponent(msg)}&embeds[]=${encodeURIComponent(MINI_APP_URL)}`
      });
    } catch (err) {
      console.warn("openUrl failed", err);
    }

    // 2) optimistic server mark (api/markShared)
    try {
      const res = await fetch("/api/markShared", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, fid: userFID })
      });

      if (!res.ok) {
        console.warn("markShared not ok, fallback - still treat as shared");
        setCanInteract(true);
        setDailyToast("Shared! (backend not available)");
        setTimeout(() => setDailyToast(null), 1800);
        setDailyLoading(false);
        return;
      }

      // success - server returned data
      await res.json();
      setCanInteract(true);
      setDailyToast("Berhasil! Aksi harian sudah dibuka.");
      setTimeout(() => setDailyToast(null), 1800);

      // refresh summary after mark
      fetchDailyStatus();
    } catch (err) {
      console.error("markShared error", err);
      setCanInteract(true); // optimistic fallback
      setDailyToast("Shared! (offline fallback)");
      setTimeout(() => setDailyToast(null), 1500);
    } finally {
      setDailyLoading(false);
    }
  }

  // safeTabSetter: prevents non-dev from going to daily
  function safeSetTab(t: Tab) {
    if (t === "daily" && userFID !== DEV_FID) {
      setDailyToast("Daily tab is currently for tester FID only.");
      setTimeout(() => setDailyToast(null), 1800);
      return;
    }
    setTab(t);
  }

  // ============================================================
  // RENDER content per tab (My Bean shows share prompt if cannot interact)
  // ============================================================
  function renderContent() {
    // MINT
    if (tab === "mint") {
      return (
        <div className="card">
          <div className="title">Kimmi Beans</div>
          <div className="subtitle">Mint cute, unique beans every day!</div>

          <div className="image-container">
            {mintResult ? (
              <img src={mintResult.image} alt="Minted Bean" />
            ) : (
              <img src="/bean.gif" alt="Bean" />
            )}
          </div>

          <div className="counter">
            {soldOut ? (
              <b>🎉 Sold Out — 10000 / 10000</b>
            ) : (
              <b>{totalMinted} / {MAX_SUPPLY} Minted</b>
            )}
          </div>

          {!mintResult && (
            <>
              {!isConnected && (
                <button className="main-btn" onClick={() => connect({ connector: connectors[0] })}>
                  Connect Wallet
                </button>
              )}

              {isConnected && wallet && (
                soldOut ? (
                  <button className="main-btn disabled">Sold Out 🎉</button>
                ) : (
                  <MintButton
                    userAddress={wallet}
                    fid={userFID ?? 0}
                    username={displayName || ""}
                    onMintSuccess={(d) => {
                      setMintResult(d);
                      setTotalMinted((prev) => prev + 1);
                      setTimeout(() => window.location.reload(), 400);
                    }}
                  />
                )
              )}
            </>
          )}

          {mintResult && (
            <>
              <div className="mint-info">
                Token #{mintResult.id} — Rarity: <b>{mintResult.rarity}</b>
              </div>

              <button className="share-btn" onClick={() => shareToCast(mintResult.id, mintResult.rarity)}>
                Share to Cast 🚀
              </button>
            </>
          )}
        </div>
      );
    }

    // MY BEAN
    if (tab === "bean") {
      if (!isConnected || !wallet) {
        return (
          <div className="card">
            <div className="title">My Bean</div>
            <p>Please connect your wallet first.</p>
          </div>
        );
      }

      if (!mintResult) {
        return (
          <div className="card">
            <div className="title">My Bean</div>
            <p>You don’t own a Kimmi Bean NFT yet.</p>
            <button className="main-btn" onClick={() => setTab("mint")}>Mint Now 🫘</button>
          </div>
        );
      }

      // If user does not have bean_stats yet (no row in DB)
      if (!hasBeanStats) {
        return (
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Menunggu sinkronisasi data Bean</div>
            <div style={{ marginTop: 8, opacity: 0.9 }}>
              Kamu sudah mint NFT, tapi data profil Bean belum tersedia di server kami.
              Biasanya ini selesai otomatis dalam beberapa menit setelah transaksi konfirmasi.
            </div>

            <div style={{ marginTop: 14 }}>
              <button
                className="main-btn"
                onClick={() => { fetchDailyStatus(); setDailyToast("Mengecek kembali..."); setTimeout(()=>setDailyToast(null),1200); }}
                disabled={dailyLoading}
              >
                {dailyLoading ? "Mengecek..." : "Cek ulang status"}
              </button>
            </div>

            <div style={{ marginTop: 12, color: "#666", fontSize: 13 }}>
              Jika lebih dari 10 menit belum muncul, cek transaksi mint atau hubungi tim.
            </div>
          </div>
        );
      }

      // Now we know hasBeanStats === true
      // If user cannot interact yet (not shared today), show Share & Unlock banner
      if (!canInteract) {
        const lvl = dailySummary.level ?? Math.floor(lifetimeXp / 100);
        const beans = dailySummary.beans ?? dailyBeans;
        const rankDisplay = dailySummary.rank ? `#${dailySummary.rank}` : "Not ranked";
        const usernameText = dailySummary.username || displayName || wallet;

        return (
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Bagikan progresmu — buka aksi harian!</div>
            <div style={{ marginTop: 8, opacity: 0.9 }}>
              Bagikan ringkasan (Level {lvl} • 🫘 {beans} • {rankDisplay}) ke Warpcast untuk membuka tombol Feed / Water / Train.
            </div>

            <div style={{ marginTop: 16 }}>
              <button
                className="main-btn"
                onClick={() => handleShareProgress()}
                disabled={dailyLoading}
              >
                {dailyLoading ? "Membuka..." : "Share & Unlock 🚀"}
              </button>
            </div>

            <div style={{ marginTop: 12, color: "#666", fontSize: 13 }}>
              Setelah dishare, tombol aksi harian akan aktif. XP & Beans tetap berasal dari kontrak saat kamu melakukan aksi.
            </div>
          </div>
        );
      }

      // canInteract === true -> show EvolutionPanel normal
      return (
        <EvolutionPanel
          wallet={wallet}
          isConnected={isConnected}
          bean={mintResult}
          fid={userFID}
          username={displayName}
          onStatsUpdate={(xp, beans) => {
            handleStatsUpdate(xp, beans);
            fetchDailyStatus();
          }}
          canInteract={true}
        />
      );
    }

    // RANK
    if (tab === "rank") {
      const userRank = leaderboard.findIndex(
        (p) => p.wallet.toLowerCase() === wallet?.toLowerCase()
      ) + 1;

      return (
        <div className="leaderboard-card">
          <div className="leader-title">🏆 Leaderboard</div>

          {loadingRank ? (
            <p className="leader-loading">Loading...</p>
          ) : leaderboard.length === 0 ? (
            <p className="leader-loading">No players yet.</p>
          ) : (
            <>
              <div style={{ width: "100%", overflowY: "auto", padding: "8px 0", maxHeight: "56vh" }}>
                <div className="leader-list">
                  {leaderboard.slice(0, 100).map((p, index) => (
                    <div className="leader-item" key={p.wallet}>
                      <div className="leader-left">
                        <div className="rank-num">{index + 1}</div>
                        <div className="leader-info">
                          <div className="leader-name">{p.username || p.wallet}</div>
                          <div className="leader-wallet">{p.wallet.slice(0, 5)}...{p.wallet.slice(-3)}</div>
                        </div>
                      </div>
                      <div className="leader-right">
                        <span className="leader-stat">Lvl {p.level}</span>
                        <span className="leader-stat">🫘 {p.beans}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {wallet && (
                <div className="user-rank-box" style={{ marginTop: 12 }}>
                  <span className="user-rank-label">Your Rank</span>
                  <span className="user-rank-value" style={{ marginLeft: 8 }}>
                    {userRank > 0 ? `#${userRank}` : "Not in Top 100"}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    // DAILY (mini) - only share summary (for DEV_FID)
    if (tab === "daily") {
      const lvl = dailySummary.level ?? Math.floor(lifetimeXp / 100);
      const beans = dailySummary.beans ?? dailyBeans;
      const rankDisplay = dailySummary.rank ? `#${dailySummary.rank}` : "Not ranked";
      const usernameText = dailySummary.username || displayName || wallet;

      return (
        <div className="card" style={{ alignItems: "stretch" }}>
          <div style={{ textAlign: "center", width: "100%" }}>
            <div className="title">Daily Progress</div>
            <div style={{ marginTop: 6, marginBottom: 8 }} className="subtitle">
              Bagikan progresmu — bantu Kimmi Beans dikenal lebih luas.
            </div>
          </div>

          <div style={{ width: "100%", maxWidth: 420, marginTop: 8 }}>
            {dailyLoading ? (
              <div style={{ textAlign: "center", padding: 24 }}>Loading...</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ fontSize: 14, opacity: 0.9 }}>
                  <b>{usernameText}</b> — Level <b>{lvl}</b> • 🫘 <b>{beans}</b>
                </div>

                <div style={{ fontSize: 13, color: "#333", opacity: 0.85 }}>
                  Current Rank: <b>{rankDisplay}</b>
                </div>

                <div style={{ fontSize: 13, color: "#666" }}>
                  Bagikan ringkasan ini ke Warpcast untuk menunjukkan progress kamu.
                </div>

                <div style={{ marginTop: 8 }}>
                  <button
                    className="share-btn"
                    onClick={() => handleShareProgress()}
                    disabled={dailyLoading}
                  >
                    {dailyLoading ? "Sharing..." : "Share your progress 🚀"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // FAQ
    if (tab === "faq") {
      return (
        <div className="card">
          <div className="title">FAQ</div>
          <div style={{ textAlign: "left", width: "100%", maxWidth: 420 }}>
            <div style={{ marginBottom: 12 }}>
              <b>🫘 What is Kimmi Beans?</b>
              <div style={{ opacity: 0.9 }}>A fun Farcaster Mini App where you mint and grow your own Bean NFT.</div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <b>⚡ How do I earn XP & Beans?</b>
              <div style={{ opacity: 0.9 }}>Take care of your Bean every day by feeding, watering, and training it.</div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <b>📈 Which action gives the best reward?</b>
              <div style={{ opacity: 0.9 }}>Train &gt; Water &gt; Feed — higher difficulty = higher XP & Beans reward.</div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <b>💰 What are Beans used for?</b>
              <div style={{ opacity: 0.9 }}>Beans increase leaderboard ranking and unlock future rewards.</div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <b>🔒 How many NFTs can I mint?</b>
              <div style={{ opacity: 0.9 }}>Only 1 NFT per wallet — your Bean is unique and yours forever.</div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <b>🔵 Is this on Base?</b>
              <div style={{ opacity: 0.9 }}>Yes! All minting and actions run on Base blockchain.</div>
            </div>
          </div>
        </div>
      );
    }
  }

  // ============================================================
  // UI Layout
  // ============================================================
  return (
    <div className="app">
      {/* HEADER */}
      <div className="header">
        <div className="header-left">
          <img src={pfp || "/icon.png"} className="user-pfp" />
          <span className="app-name">{displayName || "Guest"}</span>
        </div>

        <div className="header-right">
          <div className="header-stats">
            <div className="header-badge">🫘 {dailyBeans}</div>
            <div className="header-badge">⭐ {lifetimeXp}</div>
          </div>

          {wallet && (
            <div className="wallet-badge">
              {wallet.slice(0, 4)}...{wallet.slice(-3)}
            </div>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className={`content-bg ${tab === "rank" ? "leader-mode" : ""}`}>
        {renderContent()}
      </div>

      <div id="toast-root"></div>

      {/* NAV */}
      <div className="bottom-nav">
        <div className={`nav-item ${tab === "mint" ? "active" : ""}`} onClick={() => safeSetTab("mint")}>
          🫘<span>Mint</span>
        </div>

        <div className={`nav-item ${tab === "bean" ? "active" : ""}`} onClick={() => safeSetTab("bean")}>
          🌱<span>My Bean</span>
        </div>

        <div className={`nav-item ${tab === "rank" ? "active" : ""}`} onClick={() => safeSetTab("rank")}>
          🏆<span>Rank</span>
        </div>

        {/* show daily nav only for DEV_FID (tester) */}
        {userFID === DEV_FID && (
          <div className={`nav-item ${tab === "daily" ? "active" : ""}`} onClick={() => safeSetTab("daily")}>
            🚀<span>Daily</span>
          </div>
        )}

        <div className={`nav-item ${tab === "faq" ? "active" : ""}`} onClick={() => safeSetTab("faq")}>
          ❓<span>FAQ</span>
        </div>
      </div>

      {/* daily toast */}
      {dailyToast && (
        <div className="toast-popup">{dailyToast}</div>
      )}
    </div>
  );
}