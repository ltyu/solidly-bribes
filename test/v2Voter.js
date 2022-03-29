const { expect } = require('chai');
const { ethers } = require('hardhat');
const { DAY, fastForward } = require('./helpers');

describe('V2Voter', () => {
  let owner, owner2;
  let Token; 
  let BaseV1Pair;
  let core;
  let voter;
  let ve;
  let underlyingToken;
  let rewardToken;
  let gaugeToken;
  let mim;
  let ust;
  let v2Voter;
  let v2BribesFactory;
  let firstPoolAddress;
  let firstV1Gauge;

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
    v2Voter = await V2Voter.deploy(ve.address, voter.address, v2BribesFactory.address, owner.address);
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
    firstV1Gauge = await voter.gauges(firstPair.address);
    await v2Voter.createBribe(firstV1Gauge);
    firstV2BribeAddress = await v2Voter.bribes(firstV1Gauge);
    expect(firstV2BribeAddress).to.equal(await v2BribesFactory.lastBribe());
  });

  it('should be able to pause V2Voter', async () => {
    await expect(v2Voter.connect(owner2).setPaused(true)).to.be.revertedWith('Only the contract owner may perform this action');
    await v2Voter.connect(owner).setPaused(true);
    await expect(v2Voter.createBribe(firstV1Gauge)).to.be.revertedWith('This action cannot be performed while the contract is paused');
    await v2Voter.connect(owner).setPaused(false);
  });

  it('should only allow 1 bribe per contract', async () => {
    await expect(v2Voter.createBribe(firstV1Gauge)).to.be.revertedWith('Bribe already exists');
  });
  

  describe('vote', () => {
    const weights = [150, 50];
    let poolVotes = [];
    let tokenId;
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
      
      poolVotes.push(firstPoolAddress, secondPoolAddress);

      // Create a v2Bribe for the above secondPair
      const secondV1Gauge = await voter.gauges(secondPair.address);
      await v2Voter.createBribe(secondV1Gauge);
      secondV2BribeAddress = await v2Voter.bribes(secondV1Gauge);
      expect(secondV2BribeAddress).to.equal(await v2BribesFactory.lastBribe());
      
      // Lock another VE
      await underlyingToken.connect(owner2).approve(ve.address, ethers.BigNumber.from('10000000000000000000000000'));
      tokenId = await ve.connect(owner2).callStatic.create_lock(ethers.BigNumber.from('100000000000000000000000'), 4 * 365 * 86400);
      await ve.connect(owner2).create_lock(ethers.BigNumber.from('100000000000000000000000'), 4 * 365 * 86400);
      
      // Authroize, transfer, and vote
      await ve.connect(owner2).setApprovalForAll(v2Voter.address, true);
      await v2Voter.connect(owner2).transferToProxy(tokenId);
      await v2Voter.connect(owner2).vote(tokenId, poolVotes, weights); //owner2 can still vote on v2
    });

    it('should have sent the nft to the v2Vote contract', async () => {
      expect(await ve.isApprovedOrOwner(v2Voter.address, tokenId)).to.equal(true);
      expect(await ve.isApprovedOrOwner(owner2.address, tokenId)).to.equal(false);
    });
    
    it('should split votes between multiple pools', async () => {
      const firstV2Bribe = await (await ethers.getContractFactory('V2Bribe')).attach(firstV2BribeAddress);
      const secondV2Bribe = await (await ethers.getContractFactory('V2Bribe')).attach(secondV2BribeAddress);
      expect(await firstV2Bribe.balanceOf(tokenId) / await secondV2Bribe.balanceOf(tokenId)).to.closeTo(weights[0] / weights[1], .1);
      expect(await v2Voter.usedWeights(tokenId)).to.closeTo((await ve.balanceOfNFT(tokenId)), 1000);
      expect(await voter.usedWeights(tokenId)).to.closeTo((await ve.balanceOfNFT(tokenId)), 1000);
    });

    it('should prevent voting by non-owners', async () => {
      await expect(v2Voter.connect(owner).vote(tokenId, poolVotes, weights)).to.be.revertedWith('Not Authorized');
      await expect(v2Voter.connect(owner).vote(tokenId + 100, poolVotes, weights)).to.be.revertedWith('Not Authorized');
    });

    it('should prevent an nft for voting more than once every 10 days', async () => {
      await expect(v2Voter.connect(owner2).vote(tokenId, poolVotes, weights)).to.be.revertedWith('Too early to change votes'); //owner2 can still vote
    });

    it('should not allow the owner be able to vote on v1', async () => {
      await expect(voter.connect(owner2).vote(tokenId, poolVotes, weights)).to.be.reverted;
    });

    it('should keep track of the nft owners', async () => {
      const nftBalance = await v2Voter.balanceOf(owner2.address);
      expect(nftBalance).to.equal(1);
      expect(await v2Voter.nftOwner(tokenId)).to.equal(owner2.address);
      expect(await v2Voter.ownerToNFTokenIdList(owner2.address, nftBalance - 1)).to.equal(tokenId);
    });
  });

  describe('claim', () => {
    let tokenId;
    before(async () => {
      // Lock another VE
      await underlyingToken.connect(owner2).approve(ve.address, ethers.BigNumber.from('10000000000000000000000000'));
      tokenId = await ve.connect(owner2).callStatic.create_lock(ethers.BigNumber.from('100000000000000000000000'), 4 * 365 * 86400);
      await ve.connect(owner2).create_lock(ethers.BigNumber.from('100000000000000000000000'), 4 * 365 * 86400);
      
      // Authorize, transfer, and vote with VE
      await ve.connect(owner2).setApprovalForAll(v2Voter.address, true);
      await v2Voter.connect(owner2).transferToProxy(tokenId);
      await v2Voter.connect(owner2).vote(tokenId, [firstPoolAddress], [150]); //owner2 can still vote

      // Approve and notify bribe rewards
      v2Bribe = await (await ethers.getContractFactory('V2Bribe')).attach(firstV2BribeAddress);
      await underlyingToken.approve(v2Bribe.address, ethers.BigNumber.from('100000000000000000000000000'));
      await v2Bribe.notifyRewardAmount(underlyingToken.address, ethers.BigNumber.from('700000000000000000000')) // 700
    });

    it('should be able to claim bribes', async () => {
      const initialEarned = await v2Bribe.connect(owner2).earned(underlyingToken.address, tokenId);
      expect(initialEarned).to.be.eq(0);

      await fastForward(7*DAY);

      const preClaimEarned = await v2Bribe.connect(owner2).earned(underlyingToken.address, tokenId);
      expect(initialEarned).to.be.lt(preClaimEarned);
      
      const preClaimBalance = await underlyingToken.balanceOf(owner2.address);
      await v2Voter.connect(owner2).claimBribes(tokenId, [underlyingToken.address]);
      const postClaimBalance = await underlyingToken.balanceOf(owner2.address);
      const postClaimEarned = await v2Bribe.connect(owner2).earned(underlyingToken.address, tokenId);
      expect(postClaimEarned).to.eq(0);
      expect(postClaimBalance).to.gt(preClaimBalance);
    });

    it('should only allow owners to claim', async () => {
      await expect(v2Voter.connect(owner).claimBribes(tokenId, [underlyingToken.address])).to.revertedWith('Not Authorized');
    });

  });

  describe('withdrawFromProxy', () => {
    let tokenId;
    beforeEach(async () => {
      // Lock another VE
      await underlyingToken.connect(owner2).approve(ve.address, ethers.BigNumber.from('10000000000000000000000000'));
      tokenId = await ve.connect(owner2).callStatic.create_lock(ethers.BigNumber.from('100000000000000000000000'), 4 * 365 * 86400);
      await ve.connect(owner2).create_lock(ethers.BigNumber.from('100000000000000000000000'), 4 * 365 * 86400);
      
      // Authorize, transfer, and vote with VE
      await ve.connect(owner2).setApprovalForAll(v2Voter.address, true);
      await v2Voter.connect(owner2).transferToProxy(tokenId);
      await v2Voter.connect(owner2).vote(tokenId, [firstPoolAddress], [150]); //owner2 can still vote

      // Approve and notify bribe rewards
      v2Bribe = await (await ethers.getContractFactory('V2Bribe')).attach(firstV2BribeAddress);
      await underlyingToken.approve(v2Bribe.address, ethers.BigNumber.from('100000000000000000000000000'));
      await v2Bribe.notifyRewardAmount(underlyingToken.address, ethers.BigNumber.from('700000000000000000000')) // 700
    });

    it('should only allow the owner to withdraw', async () => {
      await expect(v2Voter.connect(owner).withdrawFromProxy(tokenId)).to.be.revertedWith('Not Authorized');
    });

    it('should be able to withdraw an NFT after votes are reset', async () => {
      fastForward(10*DAY);
      await v2Voter.connect(owner2).reset(tokenId);
      await v2Voter.connect(owner2).withdrawFromProxy(tokenId);

      expect(await ve.isApprovedOrOwner(v2Voter.address, tokenId)).to.be.equal(true);
      expect(await ve.isApprovedOrOwner(owner2.address, tokenId)).to.be.equal(true);
      expect(await v2Voter.nftOwner(tokenId)).to.equal(ethers.constants.AddressZero);
      await expect(v2Voter.connect(owner2).claimBribes(tokenId, [underlyingToken.address])).to.revertedWith('Not Authorized');
    });

    it('should keep track of the nft owners', async () => {
      fastForward(10*DAY);
      await v2Voter.connect(owner2).reset(tokenId);
      await v2Voter.connect(owner2).withdrawFromProxy(tokenId);

      // should keep track of the nft owners
      const nftBalance = await v2Voter.balanceOf(owner2.address);
      expect(nftBalance).to.equal(nftBalance);
      expect(await v2Voter.nftOwner(tokenId)).to.equal(ethers.constants.AddressZero);
      expect(await v2Voter.ownerToNFTokenIdList(owner2.address, nftBalance)).to.equal(0);
    });
  });

  describe('reset', () => {
    let tokenId;
    before(async () => {
      // Lock another VE
      await underlyingToken.connect(owner2).approve(ve.address, ethers.BigNumber.from('10000000000000000000000000'));
      tokenId = await ve.connect(owner2).callStatic.create_lock(ethers.BigNumber.from('100000000000000000000000'), 4 * 365 * 86400);
      await ve.connect(owner2).create_lock(ethers.BigNumber.from('100000000000000000000000'), 4 * 365 * 86400);
      
      // Authorize, transfer, and vote with VE
      await ve.connect(owner2).setApprovalForAll(v2Voter.address, true);
      await v2Voter.connect(owner2).transferToProxy(tokenId);
      await v2Voter.connect(owner2).vote(tokenId, [firstPoolAddress], [150]); //owner2 can still vote

      // Approve and notify bribe rewards
      v2Bribe = await (await ethers.getContractFactory('V2Bribe')).attach(firstV2BribeAddress);
      await underlyingToken.approve(v2Bribe.address, ethers.BigNumber.from('100000000000000000000000000'));
      await v2Bribe.notifyRewardAmount(underlyingToken.address, ethers.BigNumber.from('700000000000000000000')) // 700
    });

    it('should require the vote delay to pass before resetting', async () => {
      const usedWeights = await voter.connect(owner2).usedWeights(tokenId);
      const v2UsedWeights = await v2Voter.connect(owner2).usedWeights(tokenId);
      fastForward(7*DAY);
      await expect(v2Voter.connect(owner2).reset(tokenId)).to.be.revertedWith('Too early to change votes');
      fastForward(3*DAY);
      await v2Voter.connect(owner2).reset(tokenId);
      const postUsedWeights = await voter.connect(owner2).usedWeights(tokenId);
      const v2PostUsedWeights = await v2Voter.connect(owner2).usedWeights(tokenId);

      expect(usedWeights).to.eq(v2UsedWeights);
      expect(postUsedWeights).to.eq(v2PostUsedWeights);
      expect(postUsedWeights).to.eq(0);
      expect(postUsedWeights).to.be.lt(usedWeights);
    });
  });
});