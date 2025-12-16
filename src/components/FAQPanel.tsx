// src/components/FAQPanel.tsx

export default function FAQPanel() {
  const faqList = [
    {
      icon: "🫘",
      q: "What is Kimmi Beans?",
      a: "A fun Farcaster Mini App where you mint and grow your own Bean NFT."
    },
    {
      icon: "⚡",
      q: "How do I earn XP & Beans?",
      a: "Take care of your Bean every day by feeding, watering, and training it."
    },
    {
      icon: "📈",
      q: "Which action gives the best reward?",
      a: "Train > Water > Feed — higher difficulty gives higher XP & Beans reward."
    },
    {
      icon: "💰",
      q: "What are Beans used for?",
      a: "Beans increase leaderboard ranking and unlock future rewards."
    },
    {
      icon: "🔒",
      q: "How many NFTs can I mint?",
      a: "Only 1 NFT per wallet — your Bean is unique and yours forever."
    },
    {
      icon: "🔵",
      q: "Is this on Base?",
      a: "Yes — all minting and actions run on the Base blockchain."
    }
  ];

  return (
    <div className="faq-wrapper" role="region" aria-label="FAQ area">
      {/* HEADER */}
      <div className="faq-header" aria-hidden="true">
        <div className="leader-title" style={{ margin: 0 }}>
          FAQ
        </div>
      </div>

      {/* SCROLLABLE LIST */}
      <div className="faq-list" aria-live="polite">
        {faqList.map((item, i) => (
          <div className="leader-item" key={i}>
            <div className="leader-left">
              <div
                style={{
                  minWidth: 40,
                  minHeight: 40,
                  borderRadius: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(180deg,#fff6f0,#ffe6ca)",
                  color: "#ff7f2e",
                  fontSize: 18,
                  boxShadow: "0 3px 8px rgba(255,127,46,0.06)"
                }}
              >
                {item.icon}
              </div>

              <div className="leader-info" style={{ marginTop: -1 }}>
                <div className="leader-name" style={{ fontWeight: 700 }}>
                  {item.q}
                </div>
                <div
                  className="leader-wallet"
                  style={{ fontSize: 12, opacity: 0.65 }}
                >
                  {item.a}
                </div>
              </div>
            </div>

            <div className="leader-right" aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
}