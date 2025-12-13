// src/components/BottomNav.tsx

type Tab = "mint" | "bean" | "rank" | "faq";

type BottomNavProps = {
  tab: Tab;
  hasMinted: boolean;
  onChange: (t: Tab) => void;
};

export default function BottomNav({
  tab,
  hasMinted,
  onChange,
}: BottomNavProps) {
  return (
    <div className="bottom-nav">
      {/* MINT — only if NOT minted */}
      {!hasMinted && (
        <NavItem
          active={tab === "mint"}
          icon="🫘"
          label="Mint"
          onClick={() => onChange("mint")}
        />
      )}

      <NavItem
        active={tab === "bean"}
        icon="🌱"
        label="My Bean"
        onClick={() => onChange("bean")}
      />

      <NavItem
        active={tab === "rank"}
        icon="🏆"
        label="Rank"
        onClick={() => onChange("rank")}
      />

      <NavItem
        active={tab === "faq"}
        icon="❓"
        label="FAQ"
        onClick={() => onChange("faq")}
      />
    </div>
  );
}

function NavItem({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <div
      className={`nav-item ${active ? "active" : ""}`}
      onClick={onClick}
      role="button"
      aria-label={label}
    >
      <span className="nav-icon">{icon}</span>
      <span className="nav-label">{label}</span>
    </div>
  );
}