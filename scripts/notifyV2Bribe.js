const { ethers } = require("hardhat");

async function main() {
  const [owner] = await ethers.getSigners();
  const v2Voter = await (await ethers.getContractFactory('V2Voter')).attach('0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82');
  const v2BribeAddress = await v2Voter.bribes("0x856e4424f806D16E8CBC702B3c0F2ede5468eae5");
  await (await ethers.getContractFactory('V2Bribe')).attach(v2BribeAddress).approve(v2Bribe.address, ethers.BigNumber.from('10000000000000'));
  await (await ethers.getContractFactory('V2Bribe')).attach(v2BribeAddress).notifyRewardAmount('0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512', 10000000000000);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });