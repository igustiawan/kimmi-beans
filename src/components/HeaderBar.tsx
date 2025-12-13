// src/components/HeaderBar.tsx

type HeaderBarProps = {
  pfp?: string | null;
  displayName?: string | null;

  beans: number;
  xp: number;

  wallet?: string;
};

export default function HeaderBar({
  pfp,
  displayName,
  beans,
  xp,
  wallet,
}: HeaderBarProps) {
  return (
    <div className="header" role="banner">
      <div className="header-inner">
        {/* LEFT */}
        <div className="header-left">
          <img
            src={pfp || "/icon.png"}
            className="user-pfp"
            alt="pfp"
          />
          <span className="app-name">
            {displayName || "Kimmi"}
          </span>
        </div>

        {/* RIGHT */}
        <div className="header-right">
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <span className="header-badge">
              🫘 {beans}
            </span>
            <span className="header-badge">
              ⭐ {xp}
            </span>

            {wallet && (
              <span className="wallet-badge">
                {wallet.slice(0, 6)}…
                {wallet.slice(-4)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}