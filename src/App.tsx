import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect, useReadContract } from "wagmi";
import MintButton from "./components/MintButton";
import EvolutionPanel from "./components/EvolutionPanel";
import careAbi from "./abi/kimmiBeansCare.json";

export default function App() {
  const [tab, setTab] = useState<"mint" | "bean" | "rank" | "faq">("mint");

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

  // LOAD LEADERBOARD
  useEffect(() => {
    if (tab !== "rank") return;

    async function loadRank() {
      setLoadingRank(true);
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
      setLoadingRank(false);
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

      const res = await fetch(`/api/checkMinted?wallet=${wallet}`);
      const data = await res.json();

      if (data.minted) {
        setMintResult({
          id: data.tokenId,
          rarity: data.rarity,
          image: data.image
        });
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
      const res = await fetch("/api/checkSupply");
      const data = await res.json();

      setTotalMinted(data.totalMinted);
      setSoldOut(data.soldOut);
    }

    loadSupply();
    const interval = setInterval(loadSupply, 10000);
    return () => clearInterval(interval);
  }, []);

  // ============================================================
  // Share to Cast
  // ============================================================
  async function shareToCast(tokenId: number, rarity: string) {
    const miniAppURL =
      "https://farcaster.xyz/miniapps/VV7PYCDPdD04/kimmi-beans";
    const msg = `I just minted Kimmi Bean #${tokenId} — Rarity: ${rarity} 🫘✨`;

    await sdk.actions.openUrl({
      url:
        `https://warpcast.com/~/compose?text=${encodeURIComponent(msg)}` +
        `&embeds[]=${encodeURIComponent(miniAppURL)}`
    });
  }

  // ============================================================
  // Render content
  // ============================================================
  function renderContent() {
    // ------------------ MINT TAB ------------------
    if (tab === "mint") {
      return (
        <div className="card">
          <div className="title">Kimmi Beans</div>
          <div className="subtitle">Mint cute, unique beans every day!</div>

          <div className="counter">
            {soldOut ? (
              <b>🎉 Sold Out — 10000 / 10000</b>
            ) : (
              <b>{totalMinted} / {MAX_SUPPLY} Minted</b>
            )}
          </div>

          <div className="image-container">
            {mintResult ? (
              <img src={mintResult.image} alt="Minted Bean" />
            ) : (
              <img src="/bean.gif" alt="Bean" />
            )}
          </div>

          {!mintResult && (
            <>
              {!isConnected && (
                <button
                  className="main-btn"
                  onClick={() => connect({ connector: connectors[0] })}
                >
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

              <button
                className="share-btn"
                onClick={() => shareToCast(mintResult.id, mintResult.rarity)}
              >
                Share to Cast 🚀
              </button>
            </>
          )}
        </div>
      );
    }

    // ------------------ MY BEAN TAB ------------------
    if (tab === "bean") {
      if (!isConnected || !wallet) {
        return (
          <div className="card">
            <div className="title">My Bean</div>
            <p>Please connect your wallet first.</p>
          </div>
        );
      }

      // No NFT yet
      if (!mintResult) {
        return (
          <div className="card">
            <div className="title">My Bean</div>
            <p>You don’t own a Kimmi Bean NFT yet.</p>
            <button
              className="main-btn"
              onClick={() => setTab("mint")}
            >
              Mint Now 🫘
            </button>
          </div>
        );
      }

      // NFT exists → show evolution panel
      return (
        <EvolutionPanel
          wallet={wallet}
          isConnected={isConnected}
          bean={mintResult}
          fid={userFID}
          username={displayName}
          onStatsUpdate={handleStatsUpdate}
        />
      );
    }

    // ------------------ RANK ------------------
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
              {/* SCROLLABLE LIST */}
              <div className="leader-scroll">
                <div className="leader-list">
                  {leaderboard.map((p, index) => (
                    <div className="leader-item" key={p.wallet}>
                      <div className="leader-left">
                        <div className="rank-num">{index + 1}</div>

                        <div className="leader-info">
                          <div className="leader-name">{p.username}</div>
                          <div className="leader-wallet">
                            {p.wallet.slice(0, 5)}...{p.wallet.slice(-3)}
                          </div>
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

              {/* USER PERSONAL RANK */}
              {wallet && (
                <div className="user-rank-box">
                  <span className="user-rank-label">
                    Your Rank
                  </span>

                  <span className="user-rank-value">
                    {userRank > 0 ? `#${userRank}` : "Not in Top 100"}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    // ------------------ FAQ ------------------
    if (tab === "faq") {
      return (
        <div className="content-bg faq-bg">
          <div className="faq-card">
            <div className="title">FAQ</div>

            <div style={{ fontSize: "15px", opacity: 0.9 }}>

              <p><b>What is Kimmi Beans?</b><br />
              A fun Farcaster Mini App where you mint a Bean NFT and grow it daily.</p>

              <p><b>How do I earn XP & Beans?</b><br />
              Perform daily actions: Feed, Water, and Train your Bean.</p>

              <p><b>Which action gives the best reward?</b><br />
                Train ＞ Water ＞ Feed<br />
                Higher difficulty → Higher XP & Beans reward.
              </p>

              <p><b>What are Beans used for?</b><br />
              More Beans = Higher leaderboard position + future rewards.</p>

              <p><b>How many NFTs can I mint?</b><br />
              Only 1 NFT per wallet. Keep it safe!</p>

              <p><b>Is this on Base?</b><br />
              Yes! All minting and actions run on Base blockchain.</p>
              
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
        <div
          className={`nav-item ${tab === "mint" ? "active" : ""}`}
          onClick={() => setTab("mint")}
        >
          🫘<span>Mint</span>
        </div>

        <div
          className={`nav-item ${tab === "bean" ? "active" : ""}`}
          onClick={() => setTab("bean")}
        >
          🌱<span>My Bean</span>
        </div>

        <div
          className={`nav-item ${tab === "rank" ? "active" : ""}`}
          onClick={() => setTab("rank")}
        >
          🏆<span>Rank</span>
        </div>

        <div
          className={`nav-item ${tab === "faq" ? "active" : ""}`}
          onClick={() => setTab("faq")}
        >
          ❓<span>FAQ</span>
        </div>
      </div>

    </div>
  );
}
