export default function handler(req, res) {
  const { tokenId } = req.query;

  const roll = Math.random();

  let rarity = "common";
  if (roll > 0.98) rarity = "legendary";
  else if (roll > 0.90) rarity = "rare";
  else if (roll > 0.70) rarity = "epic";

  return res.json({
    rarity,
    image: `https://xkimmi.fun/beans/${rarity}.png`
  });
}
