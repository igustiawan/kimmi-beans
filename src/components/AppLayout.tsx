type Tab = "mint" | "bean" | "rank" | "faq" | "id";

type Props = {
  tab: Tab;
  hasMinted: boolean;
  pfp: string | null;
  displayName: string | null;
  wallet?: `0x${string}`;
  dailyBeans: number;
  lifetimeXp: number;
  onTabChange: (tab: Tab) => void;
  children: React.ReactNode;
  toast?: string | null;
};

export default function AppLayout({
  tab,
  hasMinted,
  pfp,
  displayName,
  wallet,
  dailyBeans,
  lifetimeXp,
  onTabChange,
  children,
  toast
}: Props) {
  return (
    <div className="app">
      {/* HEADER */}
      <div className="header">
        <div className="header-inner">
          <div className="header-left">
            <img src={pfp || "/icon.png"} className="user-pfp" />
            <span className="app-name">{displayName || "Kimmi"}</span>
          </div>

          <div className="header-right">
            <span className="header-badge">🫘 {dailyBeans}</span>
            <span className="header-badge">⭐ {lifetimeXp}</span>
            {wallet && (
              <span className="wallet-badge">
                {wallet.slice(0, 6)}…{wallet.slice(-4)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className={`content-bg ${tab === "rank" ? "leader-mode" : ""}`}>
        {children}
      </div>

      {/* NAV */}
      <div className="bottom-nav">
        {!hasMinted && (
          <div
            className={`nav-item ${tab === "mint" ? "active" : ""}`}
            onClick={() => onTabChange("mint")}
          >
            🫘<span>Mint</span>
          </div>
        )}

        <div
          className={`nav-item ${tab === "bean" ? "active" : ""}`}
          onClick={() => onTabChange("bean")}
        >
          🌱<span>My Bean</span>
        </div>

        <div
          className={`nav-item ${tab === "id" ? "active" : ""}`}
          onClick={() => onTabChange("id")}
        >
          🆔<span>My ID</span>
        </div>

        <div
          className={`nav-item ${tab === "rank" ? "active" : ""}`}
          onClick={() => onTabChange("rank")}
        >
          🏆<span>Rank</span>
        </div>

        <div
          className={`nav-item ${tab === "faq" ? "active" : ""}`}
          onClick={() => onTabChange("faq")}
        >
          ❓<span>FAQ</span>
        </div>
      </div>
           {toast && <div className="toast-popup">{toast}</div>}
    </div>
  );
}