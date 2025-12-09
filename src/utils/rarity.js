export function getRandomRarity() {
  const r = Math.random() * 100;
  if (r < 5) return "legendary";
  if (r < 20) return "rare";
  if (r < 50) return "uncommon";
  return "common";
}
