// // SPDX-License-Identifier: MIT
// pragma solidity 0.8.11;
// import "hardhat/console.sol";

// interface erc20 {
//     function transfer(address recipient, uint256 amount) external returns (bool);
//     function decimals() external view returns (uint8);
//     function balanceOf(address) external view returns (uint);
//     function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
//     function approve(address spender, uint amount) external returns (bool);
// }

// interface IBaseV1Voter {
//     function usedWeights(uint i) external returns(uint);
//     function isGauge(address gauge) external returns(bool);
//     function poolVote(uint tokenId, uint i) external returns(address);
// }

// interface IVe {
//     function ownerOf(uint _tokenId) external view returns (address);
//     function isApprovedOrOwner(address _spender, uint _tokenId) external view returns (bool);
//     function setApprovalForAll(address _operator, bool _approved) external;
// }

// // Holds the bribes
// contract Bribe {
//     mapping(address => address[]) _rewards_per_gauge;
//     mapping(address => mapping(address => uint)) _reward_per_gauge;
//     mapping(address => mapping(address => bool)) _rewards_in_gauge;
//     mapping(address => address[]) _gauges_per_reward; // inverse of _rewards_per_gauge
//     address public immutable _voter;
//     constructor(address __voter){
//         _voter = __voter;
//     }
//     function getVoterWeight(uint _nftId) external returns(uint) {
//         return IBaseV1Voter(_voter).usedWeights(_nftId);
//     }

//     // Adds the relationship between a reward and gauge
//     // Checks if the gauge and reward is already added
//     // pushes the reward address into the gauge array in _rewards_per_gauge
//     function _add(address gauge, address reward) internal {
//         if (!_rewards_in_gauge[gauge][reward]) {
//             _rewards_per_gauge[gauge].push(reward);
//             _gauges_per_reward[reward].push(gauge);
//             _rewards_in_gauge[gauge][reward] = true;
//         }
//     }

//     /*
//         Adds a reward (amount and token) to a gauge
//         1. transfers the reward token from msg.sender to this contract
//         2. update the rewards per gauge with the reward token and amount
//         3. update Period
//         4. Mark the gauges with reward addresses
//     */
//     function add_reward_amount(address gauge, address reward_token, uint amount) external returns (bool) {
//         // _safeTransferFrom(reward_token, msg.sender, address(this), amount);
//         _reward_per_gauge[gauge][reward_token] += amount;
//         _add(gauge, reward_token);
//         return true;
//     }
// }

// /* 
//     Main contract that handles bribe creation and voter registration
// */
// contract BribelyV1 {
//     // OPEN phase allows both Register and Bribe
//     // LOCK phase temporarily transfers NFTs to vote
//     // DISTRIBUTE sends back the NFT and bribe rewards
//     enum Phase { 
//         OPEN, 
//         LOCK, 
//         DISTRIBUTE 
//     }
//     Phase public phase;
//     address immutable _ve;
//     address immutable _voter;
//     address[] public bribes; // an array of bribe addresses
//     mapping(uint => address) public nftToAddress; // Maps the nftId to address

//     constructor(address __voter, address __ve) {
//         _voter = __voter;
//         _ve = __ve;
//         phase = Phase.OPEN;
//     }

//     // Registers an nft to vote. This marks a nft ready to transfer. The contract must be approved as an operator.
//     // Throws an error if not owner, phase != OPEN
//     // Sets the operator of the nft to this contract
//     // function register(uint _tokenId) external returns (bool) {
//     //     require(IVe(_ve).ownerOf(_tokenId) == msg.sender, 'Not owner');
//     //     require(IVe(_ve).isApprovedOrOwner(address(this), _tokenId), 'Contract is not approved');
//     //     require(phase == Phase.OPEN, 'Can only register during OPEN phase');
        
//     //     nftToAddress[_tokenId] = msg.sender;
//     //     return true;
//     // }

//     /*
//         Creates a new bribe and stores it in an address[]
//         Checks if a gauge is valid
//     */
//     function createBribe(address _gauge) public returns (address) {
//         require(phase == Phase.OPEN, 'Can only add bribes during OPEN phase');
//         require(IBaseV1Voter(_voter).isGauge(_gauge), 'Invalid gauge');
//         address bribe = address(new Bribe(_voter));
//         bribes.push(bribe);

//         return bribe;
//     }

//     /*
//         Lock-in the votes by transferring nft to this contract
//      */
//     function lockVotes(uint _tokenId) public {
//         // Owner sends the nft to the contract
//         // Contract keeps track of the owner to nft
//         nftToAddress[_tokenId] = msg.sender;
//     }

//     /*
//         Calculates the rewards per NFT and sends to the user.
//         Must have a locked nft
//      */
//     function distributeRewards(uint _tokenId, uint i) external{
//         // require(nftToAddress[_tokenId] != msg.sender, 'No locked NFT');
//         // loop through poolVote[_tokenId]
        
//         address votedPools = IBaseV1Voter(_voter).poolVote(_tokenId, i);
//         console.log(votedPools);
//         // for (uint i = 0; i < votedPools.length; i++) {
//         //     console.logAddress(votedPools[0]);
//         // }
//     }

//     /*
//         Returns all NFTs to owners. Only used in emergencies by contract operator.
//      */
//     function returnNFTs() public {

//     }
// }
