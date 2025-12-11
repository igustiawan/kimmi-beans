// src/App.tsx
import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect, useReadContract } from "wagmi";
import MintButton from "./components/MintButton";
import EvolutionPanel from "./components/EvolutionPanel";
import careAbi from "./abi/kimmiBeansCare.json";

type Tab = "mint" | "bean" | "rank" | "faq" | "daily";
const DEV_FID = 299929; // only this FID can access Daily for now

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

  // DAILY / MISSIONS STATE
  const [dailyStatus, setDailyStatus] = useState({
    feed: false,
    water: false,
    train: false,
    share: false,
  });
  const [streak, setStreak] = useState(0);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyToast, setDailyToast] = useState<string | null>(null);

  // LOAD LEADERBOARD (top 100)
  useEffect(() => {
    if (tab !== "rank") return;

    async function loadRank() {
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
    }

    loadRank();
  }, [tab]);

  // ============================================================
  // Load FID
  // ============================================================
  useEffect(() => {
    sdk.actions.ready();
    async function loadFID() {
      const ctx = await sdk.context;
      const user = ctx?.user;
      if (user) {
        setUserFID(user.fid);
        setDisplayName(user.displayName || null);
        setPfp(user.pfpUrl || null);
      }
    }
    loadFID();
  }, []);

  // ============================================================
  // Check minted NFT
  // ============================================================
  useEffect(() => {
    async function checkMinted() {
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
    }
    checkMinted();
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
    async function loadSupply() {
      try {
        const res = await fetch("/api/checkSupply");
        const data = await res.json();

        setTotalMinted(data.totalMinted);
        setSoldOut(data.soldOut);
      } catch (err) {
        console.error("loadSupply error", err);
      }
    }

    loadSupply();
    const interval = setInterval(loadSupply, 10000);
    return () => clearInterval(interval);
  }, []);

  // ============================================================
  // Share to Cast (used by mint flow and daily share)
  // ============================================================
  async function shareToCast(tokenId: number, rarity: string, extraMsg?: string) {
    const miniAppURL =
      "https://farcaster.xyz/miniapps/VV7PYCDPdD04/kimmi-beans";
    const msg = `I just minted Kimmi Bean #${tokenId} — Rarity: ${rarity} 🫘✨${extraMsg ? " — " + extraMsg : ""}`;

    await sdk.actions.openUrl({
      url:
        `https://warpcast.com/~/compose?text=${encodeURIComponent(msg)}` +
        `&embeds[]=${encodeURIComponent(miniAppURL)}`
    });
  }

  // ============================================================
  // DAILY / MISSIONS: fetch status from backend (if exists)
  // ============================================================
  async function fetchDailyStatus() {
    if (!wallet) {
      setDailyStatus({ feed: false, water: false, train: false, share: false });
      setStreak(0);
      return;
    }

    setDailyLoading(true);
    try {
      const res = await fetch(`/api/dailyStatus?wallet=${wallet}`);
      if (!res.ok) throw new Error("no daily API");
      const data = await res.json();
      setDailyStatus(data.tasks || { feed: false, water: false, train: false, share: false });
      setStreak(data.streak || 0);
    } catch (err) {
      console.warn("dailyStatus fetch failed, using local state", err);
    } finally {
      setDailyLoading(false);
    }
  }

  useEffect(() => {
    if (tab !== "daily") return;
    // guard - only allow DEV_FID
    if (userFID !== DEV_FID) {
      setDailyToast("Daily tab is currently for tester FID only.");
      setTimeout(() => setDailyToast(null), 2000);
      setTab("mint");
      return;
    }
    fetchDailyStatus();
  }, [tab, wallet, userFID]);

  // ============================================================
  // Handle share + claim
  // ============================================================
  async function handleShareProgress() {
    if (!wallet) {
      setDailyToast("Connect wallet first");
      setTimeout(() => setDailyToast(null), 2000);
      return;
    }

    await sdk.actions.openUrl({
      url: `https://warpcast.com/~/compose?text=${encodeURIComponent(
        `My Kimmi Bean — Lvl ${lifetimeXp} — come play! 🫘`
      )}`
    });

    try {
      const res = await fetch("/api/claimDailyShare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet })
      });

      if (!res.ok) {
        setDailyStatus(s => ({ ...s, share: true }));
        setDailyToast("Shared! (no backend reward)");
        setTimeout(() => setDailyToast(null), 2000);
        return;
      }

      const data = await res.json();
      if (data.xpEarned || data.beansEarned) {
        setDailyToast(`+${data.xpEarned ?? 0} XP  +${data.beansEarned ?? 0} Beans`);
        handleStatsUpdate((lifetimeXp || 0) + (data.xpEarned ?? 0), (dailyBeans || 0) + (data.beansEarned ?? 0));
      } else {
        setDailyToast("Shared!");
      }
      setStreak(data.streak ?? streak);
      setDailyStatus(s => ({ ...s, share: true }));
      setTimeout(() => setDailyToast(null), 2000);
    } catch (err) {
      console.error("claimDailyShare error", err);
      setDailyStatus(s => ({ ...s, share: true }));
      setDailyToast("Shared!");
      setTimeout(() => setDailyToast(null), 2000);
    }
  }

  function markTaskDone(task: "feed" | "water" | "train") {
    setDailyStatus(s => ({ ...s, [task]: true }));
  }

  // safeTabSetter: prevents non-dev from going to daily
  function safeSetTab(t: Tab) {
    if (t === "daily" && userFID !== DEV_FID) {
      setDailyToast("Daily is for tester FID only.");
      setTimeout(() => setDailyToast(null), 1800);
      return;
    }
    setTab(t);
  }

  // ============================================================
  // RENDER content per tab
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

      return (
        <EvolutionPanel
          wallet={wallet}
          isConnected={isConnected}
          bean={mintResult}
          fid={userFID}
          username={displayName}
          onStatsUpdate={(xp, beans) => {
            handleStatsUpdate(xp, beans);
            markTaskDone("feed"); // minimal heuristic
            fetchDailyStatus();
          }}
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

    // DAILY - guarded by useEffect and safeSetTab; this block only renders when allowed
    if (tab === "daily") {
      return (
        <div className="card" style={{ alignItems: "stretch" }}>
          <div style={{ textAlign: "center", width: "100%" }}>
            <div className="title">Daily Missions</div>
            <div style={{ marginTop: 6, marginBottom: 8 }} className="subtitle">
              Complete tasks to earn XP & Beans — streaks grant bonuses.
            </div>
          </div>

          <div style={{ width: "100%", maxWidth: 420 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Streak</div>
              <div style={{ fontSize: 14 }}>🔥 {streak} days</div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div className="leader-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Feed your Bean</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Small XP & Beans</div>
                </div>
                <div>
                  <button className="bean-btn" disabled={!isConnected || dailyStatus.feed} onClick={() => { markTaskDone("feed"); setDailyToast("Feed done — +XP"); setTimeout(()=>setDailyToast(null),1400); }}>
                    {dailyStatus.feed ? "Done" : "Do"}
                  </button>
                </div>
              </div>

              <div className="leader-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Water your Bean</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Medium XP & Beans</div>
                </div>
                <div>
                  <button className="bean-btn" disabled={!isConnected || dailyStatus.water} onClick={() => { markTaskDone("water"); setDailyToast("Water done — +XP"); setTimeout(()=>setDailyToast(null),1400); }}>
                    {dailyStatus.water ? "Done" : "Do"}
                  </button>
                </div>
              </div>

              <div className="leader-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Train your Bean</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Highest XP & Beans</div>
                </div>
                <div>
                  <button className="bean-btn" disabled={!isConnected || dailyStatus.train} onClick={() => { markTaskDone("train"); setDailyToast("Train done — +XP"); setTimeout(()=>setDailyToast(null),1400); }}>
                    {dailyStatus.train ? "Done" : "Do"}
                  </button>
                </div>
              </div>

              <div className="leader-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Share your progress</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Share to Warpcast — get bonus</div>
                </div>
                <div>
                  <button className="bean-btn" disabled={!isConnected || dailyStatus.share || dailyLoading} onClick={() => handleShareProgress()}>
                    {dailyLoading ? "Sharing..." : dailyStatus.share ? "Shared" : "Share"}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, textAlign: "center" }}>
              <div style={{ fontSize: 13, opacity: 0.9 }}>
                Complete tasks daily — Train &gt; Water &gt; Feed for reward scaling.
              </div>

              <div style={{ marginTop: 12 }}>
                <button className="share-btn" onClick={() => handleShareProgress()}>
                  Share Daily Progress 🚀
                </button>
              </div>
            </div>
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