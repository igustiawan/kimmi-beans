import "./../styles.css";

type Props = {
  onMint: () => void;
};

export default function MintCard({ onMint }: Props) {
  return (
    <div className="container">
      <div className="card">
        <div className="title" style={{ fontSize: 28, fontWeight: 800 }}>
          Kimmi Beans 🫘🫘
        </div>

        <div className="subtitle" style={{ opacity: 0.9 }}>
          Mint cute, unique beans every day!
        </div>

        <img src="/bean.png" className="bean-img" alt="bean" />

        <button className="mint-btn" onClick={onMint}>
          Mint Bean
        </button>
      </div>
    </div>
  );
}
