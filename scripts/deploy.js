const { ethers } = require("hardhat");


async function main() {
  const [owner] = await ethers.getSigners();

  const SolidToken = await ethers.getContractFactory("BaseV1");
  const WFTM = await ethers.getContractFactory("WrappedFtm");
  const Token = await ethers.getContractFactory("Token");
  const Gauges = await ethers.getContractFactory("BaseV1GaugeFactory");
  const Bribes = await ethers.getContractFactory("BaseV1BribeFactory");
  const Core = await ethers.getContractFactory("BaseV1Factory");
  const Factory = await ethers.getContractFactory("BaseV1Router01");
  const Ve = await ethers.getContractFactory("contracts/ve.sol:ve");
  const Ve_dist = await ethers.getContractFactory("contracts/ve_dist.sol:ve_dist");
  const BaseV1Voter = await ethers.getContractFactory("BaseV1Voter");
  const BaseV1Minter = await ethers.getContractFactory("BaseV1Minter");
  const V2BribesFactory = await ethers.getContractFactory('V2BribeFactory');
  const V2Voter = await ethers.getContractFactory('V2Voter');
  const Multicall = await ethers.getContractFactory('PaintMulticall');
  const Library = await ethers.getContractFactory('solidly_library');
  const BaseV1Pair = await ethers.getContractFactory('BaseV1Pair');

  const wftmToken = await WFTM.deploy();
  const btcToken = await Token.deploy('BTC', 'BTC', 18, '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266');
  const ethToken = await Token.deploy('ETH', 'ETH', 18, '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266');
  const token = await SolidToken.deploy();
  const gauges = await Gauges.deploy();
  const bribes = await Bribes.deploy();
  const core = await Core.deploy();
  const factory = await Factory.deploy(core.address, wftmToken.address);
  const ve = await Ve.deploy(token.address);
  const ve_dist = await Ve_dist.deploy(ve.address);
  const voter = await BaseV1Voter.deploy(ve.address, core.address, gauges.address, bribes.address);
  const minter = await BaseV1Minter.deploy(voter.address, ve.address, ve_dist.address);
  const v2BribesFactory = await V2BribesFactory.deploy();
  const v2Voter = await V2Voter.deploy(ve.address, voter.address, v2BribesFactory.address, owner.address);
  const multicall = await Multicall.deploy();
  const library = await Library.deploy(factory.address);

  await token.mint('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', ethers.BigNumber.from('1000000000000000000000000000000'));
  await wftmToken.connect(owner).deposit();
  await btcToken.mint('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', ethers.BigNumber.from('1000000000000000000000000'));
  await ethToken.mint('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', ethers.BigNumber.from('1000000000000000000000000'));

  console.log(`export const GOV_TOKEN_ADDRESS = '${token.address}'`);
  console.log(`export const VE_TOKEN_ADDRESS = '${ve.address}'`);
  console.log(`export const WFTM_ADDRESS = '${wftmToken.address}'`);
  console.log(`export const FACTORY_ADDRESS = '${core.address}'`);
  console.log(`export const ROUTER_ADDRESS = '${factory.address}'`);
  console.log(`export const VE_DIST_ADDRESS = '${ve_dist.address}'`);
  console.log(`export const VOTER_ADDRESS = '${voter.address}'`);
  console.log(`export const LIBRARY_ADDRESS = '${library.address}'`);
  console.log(`export const MULTICALL_ADDRESS = '${multicall.address}'`);
  console.log(`export const BTC_ADDRESS = '${btcToken.address}'`);
  console.log(`export const ETH_ADDRESS = '${ethToken.address}'`);
  console.log(`export const V2_VOTER_ADDRESS = '${v2Voter.address}'`);
  console.log(`export const V2_BRIBE_FACT_ADDRESS = '${v2BribesFactory.address}'`);


  await token.setMinter(minter.address);
  await ve.setVoter(voter.address);
  await ve_dist.setDepositor(minter.address);
  await voter.initialize([wftmToken.address, btcToken.address, ethToken.address], minter.address);
  await minter.initialize(["0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"], [ethers.BigNumber.from("800000000000000000000000")], ethers.BigNumber.from("100000000000000000000000000"));

  // Add Liqudity to BTC-ETH pair
  // await btcToken.connect(owner).approve(factory.address, ethers.BigNumber.from('1000000000000000000'));
  // await ethToken.connect(owner).approve(factory.address, ethers.BigNumber.from('1000000000000000000'));
  // await factory.connect(owner).addLiquidity(btcToken.address, ethToken.address, true, ethers.BigNumber.from('1000000000000000000'), ethers.BigNumber.from('1000000000000000000'), 0, 0, owner.address, Date.now());
  // const poolAddress = await core.getPair(btcToken.address, ethToken.address, true);
  // await voter.createGauge(poolAddress);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
