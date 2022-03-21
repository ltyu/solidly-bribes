const { expect } = require('chai');
const { ethers } = require('hardhat');

async function getBlockTimestamp() {
  // Get the block number
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  return block.timestamp;
}

async function moveForwardDay(day) {
    const epoch = 60 * 60 * 24 * day;
    await network.provider.send("evm_increaseTime", [epoch]);
    await network.provider.send("evm_mine");
}
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
    let firstPoolAddress;
  
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
      firstPoolAddress = await core.getPair(mim.address, ust.address, true);
      firstPair = await BaseV1Pair.attach(firstPoolAddress);
      await voter.whitelist(ust.address, 1);
      await voter.whitelist(mim.address, 1);
      await voter.createGauge(firstPoolAddress);
  
      // Create a v2Bribe for the above firstPair
      // We assume a gauge has already been created on Solidly so we create and link a V2 bribe
      const firstV1Gauge = await voter.gauges(firstPair.address);
      await v2Voter.createBribe(firstV1Gauge);
      firstV2BribeAddress = await v2Voter.bribes(firstV1Gauge);
      expect(firstV2BribeAddress).to.equal(await v2BribesFactory.lastBribe());
    
    });

    describe('notifyRewardAmount', () => {
        let secondV2Bribe;
        const weights = [150];
        let poolVotes = [];
        before(async () => {
            // Create a new pair
            const btc = await Token.deploy('BTC', 'BTC', 6, owner.address);
            const eth = await Token.deploy('ETH', 'ETH', 18, owner.address);
            await btc.mint(owner.address, ethers.BigNumber.from('1000000000000000000000000000000'));
            await eth.mint(owner.address, ethers.BigNumber.from('1000000000000000000000000000000'));
            const btcAmt = ethers.BigNumber.from('1000000000000000000');
            const ethAmt = ethers.BigNumber.from('1000000000000000000');
            await btc.connect(owner).approve(router.address, btcAmt);
            await eth.connect(owner).approve(router.address, ethAmt);
            await router.connect(owner).addLiquidity(btc.address, eth.address, true, btcAmt, ethAmt, 0, 0, owner.address, Date.now());
            const secondPoolAddress = await core.getPair(btc.address, eth.address, true);
            const secondPair = await BaseV1Pair.attach(secondPoolAddress);
            await voter.whitelist(eth.address, 1);
            await voter.whitelist(btc.address, 1);
            await voter.createGauge(secondPoolAddress);
            
            poolVotes.push(secondPoolAddress);

            // Create a v2Bribe for the above secondPair
            const secondV1Gauge = await voter.gauges(secondPair.address);
            await v2Voter.createBribe(secondV1Gauge);
            secondV2BribeAddress = await v2Voter.bribes(secondV1Gauge);
            expect(secondV2BribeAddress).to.equal(await v2BribesFactory.lastBribe());

            // Lock another VE
            await underlyingToken.connect(owner2).approve(ve.address, ethers.BigNumber.from('10000000000000000000000000'));
            await ve.connect(owner2).create_lock(ethers.BigNumber.from('100000000000000000000000'), 4 * 365 * 86400);
            
            // Authroize, transfer, and vote
            await ve.connect(owner2).setApprovalForAll(v2Voter.address, true);
            await v2Voter.connect(owner2).transferToProxy(2);
            await v2Voter.connect(owner2).vote(2, poolVotes, weights); //owner2 can still vote

            // Approve and notify bribe rewards
            secondV2Bribe = await (await ethers.getContractFactory('V2Bribe')).attach(secondV2BribeAddress);
            await underlyingToken.approve(secondV2Bribe.address, ethers.BigNumber.from('100000000000000000000000000'));
            await secondV2Bribe.notifyRewardAmount(underlyingToken.address, ethers.BigNumber.from('700000000000000000000')) // 700
        });

        it('should keep track of initial bribes', async () => {
            const rewardPerTokenNumCheckpoint = await secondV2Bribe.rewardPerTokenNumCheckpoints(underlyingToken.address);
            const { timestamp, rewardPerToken } = await secondV2Bribe.rewardPerTokenCheckpoints(underlyingToken.address, rewardPerTokenNumCheckpoint - 1)
            expect(timestamp).equal(await getBlockTimestamp())
            expect(rewardPerToken).to.equal(0);
            expect(await secondV2Bribe.periodFinish(underlyingToken.address)).to.equal(await getBlockTimestamp() + 7 * 86400);
        });

        it('should generate more rewards if voted earlier', async () => {
            let firstEarned, secondEarned, thirdEarned;
            
            firstEarned = await secondV2Bribe.earned(underlyingToken.address, 2);
            await moveForwardDay(1);

            secondEarned = await secondV2Bribe.earned(underlyingToken.address, 2);
            await moveForwardDay(1);
            thirdEarned = await secondV2Bribe.earned(underlyingToken.address, 2);

            expect(+thirdEarned).is.greaterThan(+secondEarned);
            expect(+secondEarned).is.greaterThan(+firstEarned);
            
            expect(( secondEarned - firstEarned ) / 10E18).to.be.approximately(10, 0.1);
        });

        it('should be able to add additional bribes during the same period', async () => {
            await moveForwardDay(10);
            await secondV2Bribe.notifyRewardAmount(underlyingToken.address, ethers.BigNumber.from('700000000000000000000')) // 700
            await moveForwardDay(1);
            const earned = +(await secondV2Bribe.earned(underlyingToken.address, 2));
            expect(earned).to.be.approximately(300001157407407261849, 10000);
        });

        it('only allow bribes to be claimed by v2Voter')

        it('allows multiple bribes and correct calculate the rewards earned')
    });


});