const { ethers } = require("hardhat");

async function main() {
  const [owner] = await ethers.getSigners();
  const v2Voter = await (await ethers.getContractFactory('V2Voter')).attach('0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82');
  const ve = await (await ethers.getContractFactory('contracts/ve.sol:ve')).attach('0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6');
  await ve.connect(owner).setApprovalForAll(v2Voter.address, true);
  await v2Voter.connect(owner).transferToProxy(4);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });