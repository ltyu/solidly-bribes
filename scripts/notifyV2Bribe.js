const { ethers } = require("hardhat");

async function main() {
    const [owner, owner2] = await ethers.getSigners();
    const Token = await ethers.getContractFactory('Token');
    // Create and approve some token
    ust = await Token.deploy('UST', 'UST', 6, owner.address);
    mim = await Token.deploy('MIM', 'MIM', 6, owner.address);
    await ust.mint(owner.address, ethers.BigNumber.from('1000000000000000000000000000000'));
    await mim.mint(owner.address, ethers.BigNumber.from('1000000000000000000000000000000'));
    const ust_1 = ethers.BigNumber.from('700000000000000000000');
    const mim_1 = ethers.BigNumber.from('700000000000000000000');

    const v2Bribe = await (await ethers.getContractFactory('V2Bribe')).attach('0x1F708C24a0D3A740cD47cC0444E9480899f3dA7D');
    await mim.approve(v2Bribe.address, mim_1);
    await ust.approve(v2Bribe.address, ust_1);
    await v2Bribe.notifyRewardAmount(mim.address, mim_1) // 700
    await v2Bribe.notifyRewardAmount(ust.address, ust_1) // 700
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });