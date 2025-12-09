export default function handler(req, res) {
  const { id } = req.query;

  const rarity = "common"; // sementara
  const image = `https://xkimmi.fun/beans/common.png`;

  return res.status(200).json({
    name: `Kimmi Bean #${id}`,
    description: "Cute Bean NFT",
    image,
    attributes: [
      {
        trait_type: "Rarity",
        value: rarity
      }
    ]
  });
}
