const DAY = 60 * 60 * 24;

async function fastForward(seconds) {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
}

async function getBlockTimestamp() {
  // Get the block number
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  return block.timestamp;
}

module.exports = {
  DAY,
  fastForward,
  getBlockTimestamp
};