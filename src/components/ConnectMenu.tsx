import { useAccount, useConnect } from "wagmi";

export default function ConnectMenu() {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();

  if (isConnected) {
    return (
      <div className="wallet-display">
        Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
      </div>
    );
  }

  return (
    <button
      className="main-btn"
      onClick={() => connect({ connector: connectors[0] })}
    >
      Connect Wallet
    </button>
  );
}
