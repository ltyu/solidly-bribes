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
  const v2Voter = await V2Voter.deploy(ve.address, voter.address, v2BribesFactory.address);
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
  // await minter.initialize(["0x5bDacBaE440A2F30af96147DE964CC97FE283305","0xa96D2F0978E317e7a97aDFf7b5A76F4600916021","0x95478C4F7D22D1048F46100001c2C69D2BA57380","0xC0E2830724C946a6748dDFE09753613cd38f6767","0x3293cB515Dbc8E0A8Ab83f1E5F5f3CC2F6bbc7ba","0xffFfBBB50c131E664Ef375421094995C59808c97","0x02517411F32ac2481753aD3045cA19D58e448A01","0xf332789fae0d1d6f058bfb040b3c060d76d06574","0xdFf234670038dEfB2115Cf103F86dA5fB7CfD2D2","0x0f2A144d711E7390d72BD474653170B201D504C8","0x224002428cF0BA45590e0022DF4b06653058F22F","0x26D70e4871EF565ef8C428e8782F1890B9255367","0xA5fC0BbfcD05827ed582869b7254b6f141BA84Eb","0x4D5362dd18Ea4Ba880c829B0152B7Ba371741E59","0x1e26D95599797f1cD24577ea91D99a9c97cf9C09","0xb4ad8B57Bd6963912c80FCbb6Baea99988543c1c","0xF9E7d4c6d36ca311566f46c81E572102A2DC9F52","0xE838c61635dd1D41952c68E47159329443283d90","0x111731A388743a75CF60CCA7b140C58e41D83635","0x0edfcc1b8d082cd46d13db694b849d7d8151c6d5","0xD0Bb8e4E4Dd5FDCD5D54f78263F5Ec8f33da4C95","0x9685c79e7572faF11220d0F3a1C1ffF8B74fDc65","0xa70b1d5956DAb595E47a1Be7dE8FaA504851D3c5","0x06917EFCE692CAD37A77a50B9BEEF6f4Cdd36422","0x5b0390bccCa1F040d8993eB6e4ce8DeD93721765"], [ethers.BigNumber.from("800000000000000000000000"),ethers.BigNumber.from("2376588000000000000000000"),ethers.BigNumber.from("1331994000000000000000000"),ethers.BigNumber.from("1118072000000000000000000"),ethers.BigNumber.from("1070472000000000000000000"),ethers.BigNumber.from("1023840000000000000000000"),ethers.BigNumber.from("864361000000000000000000"),ethers.BigNumber.from("812928000000000000000000"),ethers.BigNumber.from("795726000000000000000000"),ethers.BigNumber.from("763362000000000000000000"),ethers.BigNumber.from("727329000000000000000000"),ethers.BigNumber.from("688233000000000000000000"),ethers.BigNumber.from("681101000000000000000000"),ethers.BigNumber.from("677507000000000000000000"),ethers.BigNumber.from("676304000000000000000000"),ethers.BigNumber.from("642992000000000000000000"),ethers.BigNumber.from("609195000000000000000000"),ethers.BigNumber.from("598412000000000000000000"),ethers.BigNumber.from("591573000000000000000000"),ethers.BigNumber.from("587431000000000000000000"),ethers.BigNumber.from("542785000000000000000000"),ethers.BigNumber.from("536754000000000000000000"),ethers.BigNumber.from("518240000000000000000000"),ethers.BigNumber.from("511920000000000000000000"),ethers.BigNumber.from("452870000000000000000000")], ethers.BigNumber.from("100000000000000000000000000"));
  await minter.initialize(["0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"], [ethers.BigNumber.from("800000000000000000000000")], ethers.BigNumber.from("100000000000000000000000000"));

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
