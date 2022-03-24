const { ethers } = require("hardhat");

async function main() {
  const [owner] = await ethers.getSigners();
  const v2Voter = await (await ethers.getContractFactory('V2Voter')).attach('0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82');
  const v1Voter = await (await ethers.getContractFactory('BaseV1Voter')).attach('0x610178dA211FEF7D417bC0e6FeD39F05609AD788');
  const v2Bribe = await (await ethers.getContractFactory('V2BribeFactory')).attach('0x5f3f1dBD7B74C6B46e8c44f98792A1dAf8d69154');

  const core = await (await ethers.getContractFactory('BaseV1Factory')).attach('0x9d4454B023096f34B160D6B654540c56A1F81688');
  const pair = await core.getPair("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", true);
  console.log(pair);
  // console.log(await v1Voter.gauges("0xc2884803407fbc6a27a98Ce01DF40729E0Ab3d9F"));
  // console.log(await v1Voter.poolForGauge("0x856e4424f806D16E8CBC702B3c0F2ede5468eae5"));
  // const bribe = await v2Voter.createBribe("0x856e4424f806D16E8CBC702B3c0F2ede5468eae5");
  console.log(await v2Voter.bribes("0x856e4424f806D16E8CBC702B3c0F2ede5468eae5"))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });