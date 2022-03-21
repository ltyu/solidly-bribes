const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Bribely", () => {
  let Token; 
  let BaseV1Pair;
  let Router;
  let core;
  let voter;
  let ve;
  let underlyingToken;
  let owner;
  let rewardToken;
  let gaugeToken;
  let bribely;
  let mim;
  let ust;
  let pair;
  let gauge;

  let ve_dist

  beforeEach(async () => {
    [owner, owner2] = await ethers.getSigners();
    Token = await ethers.getContractFactory("Token");
    rewardToken = await Token.deploy("Fantom", "FTM", 18, owner.address);
    gaugeToken = await Token.deploy("VolatileV1 AMM-FTM/SOLID", "vAMM-FTM/SOLID", 18, owner.address);
    underlyingToken = await Token.deploy("SOLID", "SOLID", 18, owner.address);
    await underlyingToken.mint(owner.address, ethers.BigNumber.from("20000000000000000000000000"));
    await rewardToken.mint(owner.address, ethers.BigNumber.from("10000000000000000000"));
    await gaugeToken.mint(owner.address, ethers.BigNumber.from("10000000000000000000"));

    // Deploy Core
    const Core = await ethers.getContractFactory('BaseV1Factory');
    core = await Core.deploy();
    await core.deployed();

    // Deploy router
    const Router = await ethers.getContractFactory("BaseV1Router01");
    router = await Router.deploy(core.address, owner.address);
    await router.deployed();

    // Deploy Bribes
    const Bribes = await ethers.getContractFactory("BaseV1BribeFactory");
    const bribes = await Bribes.deploy();
    await bribes.deployed();

    // Deploy Gauges
    const Gauges = await ethers.getContractFactory("BaseV1GaugeFactory");
    const gauges = await Gauges.deploy();
    await gauges.deployed();

    // Deploy VE
    const Ve = await ethers.getContractFactory('contracts/ve.sol:ve');
    ve = await Ve.deploy(underlyingToken.address);
    await ve.deployed();

    // Deploy Vote
    const Voter = await ethers.getContractFactory('BaseV1Voter');
    voter = await Voter.deploy(ve.address, core.address, gauges.address, bribes.address);
    await voter.deployed();

    // Lock VE
    await underlyingToken.approve(ve.address, ethers.BigNumber.from("10000000000000000000000000"));
    await ve.create_lock(ethers.BigNumber.from("5000000000000000000000000"), 4 * 365 * 86400);

    // Deploy Bribely
    const Bribely = await ethers.getContractFactory("BribelyV1");
    bribely = await Bribely.deploy(voter.address, ve.address);
    await bribely.deployed();

    await ve.setVoter(voter.address);
    
    // Create the pairs
    BaseV1Pair = await ethers.getContractFactory("BaseV1Pair");
    ust = await Token.deploy('UST', 'UST', 6, owner.address);
    mim = await Token.deploy('MIM', 'MIM', 18, owner.address);
    await ust.mint(owner.address, ethers.BigNumber.from("1000000000000000000000000000000"));
    await mim.mint(owner.address, ethers.BigNumber.from("1000000000000000000000000000000"));
    const ust_1 = ethers.BigNumber.from("1000000000000000000");
    const mim_1 = ethers.BigNumber.from("1000000000000000000");
    await mim.connect(owner).approve(router.address, mim_1);
    await ust.connect(owner).approve(router.address, ust_1);
    await router.connect(owner).addLiquidity(mim.address, ust.address, true, mim_1, ust_1, 0, 0, owner.address, Date.now());
    const address = await core.getPair(mim.address, ust.address, true);
    pair = await BaseV1Pair.attach(address);
    await voter.whitelist(ust.address, 1);
    await voter.whitelist(mim.address, 1);
    await voter.createGauge(address);
  
  });

  it('should allow nft registration', async () => {
    await ve.approve(bribely.address, 1);
    await bribely.connect(owner).register(1);
    const addressOfNft = await bribely.nft_to_address(1);
    expect(addressOfNft).to.equal(owner.address);
  });

  it('should throw error if non-owner registers', async () => {
    await expect(bribely.connect(owner2).register(1)).to.be.reverted;
  });

  it('should be able to create a new bribe', async () => {
    const gauge = await voter.gauges(pair.address);
    await bribely.createBribe(gauge);
    expect(await bribely.bribes(0)).to.exist;
  });

  it('should distribute bribes based off of pool votes', async () => {
    await voter.vote(1, [pair.address], [5000]);
    const result = await bribely.distributeRewards(1, 1);
  });
  xit('should prevent a user from registering 1 hour before epoch ends', async  () => {

  });

  xit('should be able to register a user', async () => {

  });

  xit('should approve a venft to the contract', async () => {

  });

  xit('should allow deposits of new bribes');

  xit('should stop taking bribes 1 hour before epoch ends');

  xit('should lock in the users nft by sending it to the contract 1 hour before epoch ends');

  xit('should vote for a gauge');

  xit('calculates the bribe rewards per nft =');

  xit('sends back the nft with bribe rewards to the owner');

  xit('should be able to get voters total used weights (for estimations)', async () => {
    await voter.vote(1, [pair.address], [5000]);
    console.log(await voter.usedWeights(1))
    expect(await voter.usedWeights(1)).to.closeTo((await ve.balanceOfNFT(1)), 1000);
    
    // expect(await bribely.getVoterWeight(1)).to.equal(1);
  });

  xit('should be able to get the voters used weight for a pool', async () => {

  });
  xit('should be able to add bribe(s)', async () => {
    await bribely.add_reward_amount(gaugeToken.address, rewardToken.address, 100000000);
    let rewardsPerGauge = await bribely.reward_per_gauge(gaugeToken.address, rewardToken.address);
    expect(rewardsPerGauge).to.equal(100000000);

    // Multiple with the same reward
    await bribely.add_reward_amount(gaugeToken.address, rewardToken.address, 200000000);
    rewardsPerGauge = await bribely.reward_per_gauge(gaugeToken.address, rewardToken.address);
    expect(rewardsPerGauge).to.equal(300000000);
    expect((await bribely.rewards_per_gauge(gaugeToken.address)).length).to.equal(1);

    // Add different Tokens
    const differentRewardToken = await tokenContract.deploy("TOMB", "TOMB", 18, owner.address);
    await bribely.add_reward_amount(gaugeToken.address, differentRewardToken.address, 200000000);
    tombRewardsPerGauge = await bribely.reward_per_gauge(gaugeToken.address, differentRewardToken.address);
    expect(tombRewardsPerGauge).to.equal(200000000);
    expect((await bribely.rewards_per_gauge(gaugeToken.address)).length).to.equal(2);

  });

  xit('should be able to return all nfts to their owners');

})
