const { ethers } = require("hardhat");

async function main() {
  const [owner] = await ethers.getSigners();
  const v1Voter = await (await ethers.getContractFactory('BaseV1Voter')).attach('0x610178dA211FEF7D417bC0e6FeD39F05609AD788');
  const v2Voter = await (await ethers.getContractFactory('V2Voter')).attach('0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82');
  const core = await (await ethers.getContractFactory('BaseV1Factory')).attach('0x0165878A594ca255338adfa4d48449f69242Eb8F');
  const bribe = await v2Voter.createBribe("0x856e4424f806D16E8CBC702B3c0F2ede5468eae5");
  console.log(await v2Voter.bribes("0x856e4424f806D16E8CBC702B3c0F2ede5468eae5"))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });