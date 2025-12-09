export default function handler(req, res) {
  const { id } = req.query;

  const rarity = getRarity(parseInt(id));

  const metadata = {
    name: `Kimmi Bean #${id}`,
    description: "Cute Bean NFT",
    image: `https://xkimmi.fun/beans/${rarity}.png`,
    attributes: [
      { trait_type: "Rarity", value: rarity }
    ]
  };

  res.status(200).json(metadata);
}

function getRarity(id) {
  if (id % 50 === 0) return "legendary";
  if (id % 10 === 0) return "epic";
  if (id % 5 === 0) return "rare";
  return "common";
}
