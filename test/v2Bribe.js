const { expect } = require('chai');
const { ethers } = require('hardhat');
const { DAY, fastForward, getBlockTimestamp } = require('./helpers');

describe('V2Bribe', () => {
    let Token; 
    let BaseV1Pair;
    let core;
    let voter;
    let ve;
    let underlyingToken;
    let owner;
    let rewardToken;
    let gaugeToken;
    let mim;
    let ust;
    let v2Voter;
    let v2BribesFactory;
    let poolAddress;
  
    before(async () => {
      [owner, owner2] = await ethers.getSigners();
      Token = await ethers.getContractFactory('Token');
      rewardToken = await Token.deploy('Fantom', 'FTM', 18, owner.address);
      gaugeToken = await Token.deploy('VolatileV1 AMM-FTM/SOLID', 'vAMM-FTM/SOLID', 18, owner.address);
      underlyingToken = await Token.deploy('SOLID', 'SOLID', 18, owner.address);
      await underlyingToken.mint(owner.address, ethers.BigNumber.from('20000000000000000000000000'));
      await underlyingToken.mint(owner2.address, ethers.BigNumber.from('20000000000000000000000000'));
      await rewardToken.mint(owner.address, ethers.BigNumber.from('10000000000000000000'));
      await gaugeToken.mint(owner.address, ethers.BigNumber.from('10000000000000000000'));
  
      // Deploy Core
      const Core = await ethers.getContractFactory('BaseV1Factory');
      core = await Core.deploy();
      await core.deployed();
  
      // Deploy router
      const Router = await ethers.getContractFactory('BaseV1Router01');
      router = await Router.deploy(core.address, owner.address);
      await router.deployed();
  
      // Deploy Bribes
      const Bribes = await ethers.getContractFactory('BaseV1BribeFactory');
      const bribes = await Bribes.deploy();
      await bribes.deployed();
  
      // Deploy Gauges
      const Gauges = await ethers.getContractFactory('BaseV1GaugeFactory');
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
      await underlyingToken.approve(ve.address, ethers.BigNumber.from('20000000000000000000000000'));
      await ve.create_lock(ethers.BigNumber.from('5000000000000000000000000'), 4 * 365 * 86400);
  
      // Deploy V2BribesFactory
      const V2BribesFactory = await ethers.getContractFactory('V2BribeFactory');
      v2BribesFactory = await V2BribesFactory.deploy();
      await v2BribesFactory.deployed();
  
      // Deploy V2Vote
      const V2Voter = await ethers.getContractFactory('V2Voter');
      v2Voter = await V2Voter.deploy(ve.address, voter.address, v2BribesFactory.address);
      await v2Voter.deployed();
  
      await ve.setVoter(voter.address);
  
      // Create the pairs
      BaseV1Pair = await ethers.getContractFactory('BaseV1Pair');
      ust = await Token.deploy('UST', 'UST', 6, owner.address);
      mim = await Token.deploy('MIM', 'MIM', 18, owner.address);
      await ust.mint(owner.address, ethers.BigNumber.from('1000000000000000000000000000000'));
      await mim.mint(owner.address, ethers.BigNumber.from('1000000000000000000000000000000'));
      const ust_1 = ethers.BigNumber.from('1000000000000000000');
      const mim_1 = ethers.BigNumber.from('1000000000000000000');
      await mim.connect(owner).approve(router.address, mim_1);
      await ust.connect(owner).approve(router.address, ust_1);
      await router.connect(owner).addLiquidity(mim.address, ust.address, true, mim_1, ust_1, 0, 0, owner.address, Date.now());
      poolAddress = await core.getPair(mim.address, ust.address, true);
      firstPair = await BaseV1Pair.attach(poolAddress);
      await voter.whitelist(ust.address, 1);
      await voter.whitelist(mim.address, 1);
      await voter.createGauge(poolAddress);
  
      // Create a v2Bribe for the above firstPair
      // We assume a gauge has already been created on Solidly so we create and link a V2 bribe
      const firstV1Gauge = await voter.gauges(firstPair.address);
      await v2Voter.createBribe(firstV1Gauge);
      firstV2BribeAddress = await v2Voter.bribes(firstV1Gauge);
      expect(firstV2BribeAddress).to.equal(await v2BribesFactory.lastBribe());
    
    });

    describe('notifyRewardAmount', () => {
        let v2Bribe;
        before(async () => {
            // Lock another VE
            await underlyingToken.connect(owner2).approve(ve.address, ethers.BigNumber.from('10000000000000000000000000'));
            await ve.connect(owner2).create_lock(ethers.BigNumber.from('100000000000000000000000'), 4 * 365 * 86400);
            
            // Authorize, transfer, and vote with VE
            await ve.connect(owner2).setApprovalForAll(v2Voter.address, true);
            await v2Voter.connect(owner2).transferToProxy(2);
            await v2Voter.connect(owner2).vote(2, [poolAddress], [150]); //owner2 can still vote

            // Approve and notify bribe rewards
            v2Bribe = await (await ethers.getContractFactory('V2Bribe')).attach(firstV2BribeAddress);
            await underlyingToken.approve(v2Bribe.address, ethers.BigNumber.from('100000000000000000000000000'));
            await v2Bribe.notifyRewardAmount(underlyingToken.address, ethers.BigNumber.from('700000000000000000000')) // 700
        });

        it('should keep track of initial bribes', async () => {
            const rewardPerTokenNumCheckpoint = await v2Bribe.rewardPerTokenNumCheckpoints(underlyingToken.address);
            const { timestamp, rewardPerToken } = await v2Bribe.rewardPerTokenCheckpoints(underlyingToken.address, rewardPerTokenNumCheckpoint - 1)
            expect(timestamp).equal(await getBlockTimestamp())
            expect(rewardPerToken).to.equal(0);
            expect(await v2Bribe.periodFinish(underlyingToken.address)).to.equal(await getBlockTimestamp() + 7 * 86400);
        });

        it('should generate more rewards if voted earlier', async () => {
            let initialBalance, postEarnedBalance;

            initialBalance = await v2Bribe.earned(underlyingToken.address, 2);
            await fastForward(DAY);
            postEarnedBalance = await v2Bribe.earned(underlyingToken.address, 2);

            expect(initialBalance).to.be.lt(postEarnedBalance);
            expect(postEarnedBalance).to.be.gt(initialBalance);

            // increment earned by 1/7th of the bribe
            expect(postEarnedBalance.sub(initialBalance).div(ethers.BigNumber.from('1000000000000000000')).toNumber()).to.be.approximately(100, 1); // Expect to be around 100 since the bribe reward is 700
        });
    });
});