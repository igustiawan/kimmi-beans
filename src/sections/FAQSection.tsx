// src/sections/FAQSection.tsx

type FAQItem = {
  icon: string;
  q: string;
  a: string;
};

const FAQ_LIST: FAQItem[] = [
  {
    icon: "🫘",
    q: "What is Kimmi Beans?",
    a: "Kimmi Beans is a Farcaster Mini App where you mint and grow a cute Bean NFT through daily on-chain actions.",
  },
  {
    icon: "🌱",
    q: "How do I get started?",
    a: "Simply mint one Bean NFT. Each wallet can only mint one Bean, and that Bean grows with you over time.",
  },
  {
    icon: "⚡",
    q: "How do I earn XP & Beans?",
    a: "You earn XP and Beans by feeding, watering, and training your Bean. Each action is recorded on-chain.",
  },
  {
    icon: "📈",
    q: "Which action gives the most rewards?",
    a: "Train gives the highest rewards, followed by Water, then Feed. Higher effort means higher gains.",
  },
  {
    icon: "🏆",
    q: "How does the leaderboard work?",
    a: "Leaderboard rankings are calculated from on-chain event logs based on XP and Beans earned.",
  },
  {
    icon: "🔒",
    q: "How many Beans can I mint?",
    a: "Only one Bean NFT per wallet. Your Bean is unique and tied to your progress forever.",
  },
  {
    icon: "🔵",
    q: "Which blockchain is used?",
    a: "Kimmi Beans runs entirely on Base, making transactions fast and low-cost.",
  },
  {
    icon: "🚀",
    q: "Can I share my progress?",
    a: "Yes! You can share your mint result or leaderboard progress directly to Warpcast.",
  },
];

export default function FAQSection() {
  return (
    <div className="faq-wrapper">
      {/* HEADER */}
      <div className="faq-header">
        <div className="leader-title">FAQ</div>
      </div>

      {/* LIST */}
      <div className="faq-list">
        {FAQ_LIST.map((item, i) => (
          <div className="leader-item" key={i}>
            <div className="leader-left">
              {/* ICON */}
              <div
                style={{
                  minWidth: 40,
                  minHeight: 40,
                  borderRadius: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "linear-gradient(180deg,#fff6f0,#ffe6ca)",
                  color: "#ff7f2e",
                  fontSize: 18,
                  boxShadow:
                    "0 3px 8px rgba(255,127,46,0.06)",
                }}
              >
                {item.icon}
              </div>

              {/* TEXT */}
              <div className="leader-info">
                <div
                  className="leader-name"
                  style={{ fontWeight: 700 }}
                >
                  {item.q}
                </div>
                <div
                  className="leader-wallet"
                  style={{
                    fontSize: 12,
                    opacity: 0.7,
                    lineHeight: 1.4,
                  }}
                >
                  {item.a}
                </div>
              </div>
            </div>

            {/* Right spacer (keeps alignment with leaderboard) */}
            <div className="leader-right" />
          </div>
        ))}
      </div>
    </div>
  );
}