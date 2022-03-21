// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;
import "hardhat/console.sol";

/**
* @title ERC721 token receiver interface
* @dev Interface for any contract that wants to support safeTransfers
* from ERC721 asset contracts.
*/
interface IERC721Receiver {
    /**
    * @dev Whenever an {IERC721} `tokenId` token is transferred to this contract via {IERC721-safeTransferFrom}
    * by `operator` from `from`, this function is called.
    *
    * It must return its Solidity selector to confirm the token transfer.
    * If any other value is returned or the interface is not implemented by the recipient, the transfer will be reverted.
    *
    * The selector can be obtained in Solidity with `IERC721.onERC721Received.selector`.
    */
    function onERC721Received(
        address operator,
        address from,
        uint tokenId,
        bytes calldata data
    ) external returns (bytes4);
}

interface IVe {
    function token() external view returns (address);
    function balanceOfNFT(uint) external view returns (uint);
    function isApprovedOrOwner(address, uint) external view returns (bool);
    function ownerOf(uint) external view returns (address);
    function safeTransferFrom(address _from, address _to, uint _tokenId) external;
    function attach(uint tokenId) external;
    function detach(uint tokenId) external;
    function voting(uint tokenId) external;
    function abstain(uint tokenId) external;
}

interface IV1Voter {
    function isGauge(address) external view returns(bool);
    function gauges(address) external view returns(address);
    function poolForGauge(address) external view returns(address);
    function vote(uint tokenId, address[] calldata _poolVote, int256[] calldata _weights) external;
}

interface IV2BribeFactory {
    function createBribe() external returns (address);
}

interface IV2Bribe {
    function _deposit(uint amount, uint tokenId) external;
    function _withdraw(uint amount, uint tokenId) external;
    function getRewardForOwner(uint tokenId, address[] memory tokens) external;
}

contract V2Voter is IERC721Receiver {
    address public immutable _ve;
    address public immutable _v1Voter;
    address public immutable _v2BribeFactory;

    // Cannot change the vote more often than once every 10 days
    uint public constant VoteDelay = 10 * 86400;
    uint internal index;
    uint public totalWeight; // total voting weight
    address[] public pools; // all pools viable for incentives

    // Last vote time for each gauge address
    mapping(uint => mapping(address => uint256)) public lastUserVote;
    mapping(uint => address[]) public poolVote; // nft => pools
    mapping(uint => mapping(address => int256)) public votes; // nft => pool => votes
    mapping(address => address) public bribes; // gauge => bribe
    mapping(address => int256) public weights; // pool => weight
    mapping(address => address) public poolForGauge; // gauge => pool
    mapping(address => uint) internal supplyIndex;
    mapping(address => uint) public claimable;
    mapping(uint => uint) public usedWeights;  // nft => total voting weight of user
    mapping(uint => address) public nftOwner; // nft => address

    event Abstained(uint tokenId, int256 weight);
    event Voted(address indexed voter, uint tokenId, int256 weight);
    event BribeCreated(address bribe);
    constructor(address __ve, address __v1Voter, address __v2BribeFactory) {
        _ve = __ve;
        _v1Voter = __v1Voter;
        _v2BribeFactory = __v2BribeFactory;
    }

    // simple re-entrancy check
    uint internal _unlocked = 1;
    modifier lock() {
        require(_unlocked == 1);
        _unlocked = 2;
        _;
        _unlocked = 1;
    }

    function _updateFor(address _gauge) internal {
        address _pool = poolForGauge[_gauge];
        int256 _supplied = weights[_pool];
        if (_supplied > 0) {
            uint _supplyIndex = supplyIndex[_gauge];
            uint _index = index; // get global index0 for accumulated distro
            supplyIndex[_gauge] = _index; // update _gauge current position to global position
            uint _delta = _index - _supplyIndex; // see if there is any difference that need to be accrued
            if (_delta > 0) {
                uint _share = uint(_supplied) * _delta / 1e18; // add accrued difference for each supplied token
                claimable[_gauge] += _share;
            }
        } else {
            supplyIndex[_gauge] = index; // new users are set to the default global state
        }
    }

    function _vote(uint _tokenId, address[] memory _poolVote, int256[] memory _weights) internal {
        _reset(_tokenId);
        uint _poolCnt = _poolVote.length;
        int256 _weight = int256(IVe(_ve).balanceOfNFT(_tokenId));
        int256 _totalVoteWeight = 0;
        int256 _totalWeight = 0;
        int256 _usedWeight = 0;

        for (uint i = 0; i < _poolCnt; i++) {
            _totalVoteWeight += _weights[i] > 0 ? _weights[i] : -_weights[i];
        }
        for (uint i = 0; i < _poolCnt; i++) {
            address _pool = _poolVote[i];
            address _gauge = IV1Voter(_v1Voter).gauges(_pool);
            require(block.timestamp >= lastUserVote[_tokenId][_gauge] + VoteDelay, 'At least 1 gauge has already been voted for');
            if (IV1Voter(_v1Voter).isGauge(_gauge)) {
                
                int256 _poolWeight = _weights[i] * _weight / _totalVoteWeight; // weight of current vote * balanceNFT / total of _weights
                
                require(votes[_tokenId][_pool] == 0);
                require(_poolWeight != 0);    
                _updateFor(_gauge);

                poolVote[_tokenId].push(_pool);
                
                weights[_pool] += _poolWeight;
                votes[_tokenId][_pool] += _poolWeight;
                if (_poolWeight > 0) {
                    IV2Bribe(bribes[_gauge])._deposit(uint256(_poolWeight), _tokenId); // Used to tally the nft votes to bribes
                } else {
                    _poolWeight = -_poolWeight;
                }
                _usedWeight += _poolWeight;
                _totalWeight += _poolWeight;
                
                // Record the last voting time
                lastUserVote[_tokenId][_gauge] = block.timestamp;
                emit Voted(msg.sender, _tokenId, _poolWeight);
            }
        }
        
        totalWeight += uint256(_totalWeight);
        usedWeights[_tokenId] = uint256(_usedWeight);
    }

    function _reset(uint _tokenId) internal {
        address[] storage _poolVote = poolVote[_tokenId];
        uint _poolVoteCnt = _poolVote.length;
        int256 _totalWeight = 0;

        for (uint i = 0; i < _poolVoteCnt; i ++) {
            address _pool = _poolVote[i];
            int256 _votes = votes[_tokenId][_pool];

            if (_votes != 0) {
                _updateFor(IV1Voter(_v1Voter).gauges(_pool));
                weights[_pool] -= _votes;
                votes[_tokenId][_pool] -= _votes;
                if (_votes > 0) {
                    IV2Bribe(bribes[IV1Voter(_v1Voter).gauges(_pool)])._withdraw(uint256(_votes), _tokenId);
                    _totalWeight += _votes;
                } else {
                    _totalWeight -= _votes;
                }
                emit Abstained(_tokenId, _votes);
            }
        }
        totalWeight -= uint256(_totalWeight);
        usedWeights[_tokenId] = 0;
        delete poolVote[_tokenId];
    }
    
    function reset(uint _tokenId) external lock {
        require(IVe(_ve).isApprovedOrOwner(msg.sender, _tokenId));
        _reset(_tokenId);
        IVe(_ve).abstain(_tokenId);
    }    

    /*
        Transfers and tracks the nft to this contract. Need to be done before voting.
     */
    function transferToProxy(uint tokenId) external lock {
        require(IVe(_ve).isApprovedOrOwner(msg.sender, tokenId), 'Not authorized');
        IVe(_ve).safeTransferFrom(msg.sender, address(this), tokenId);
        nftOwner[tokenId] = msg.sender;
    }

    /*
        Initiates a proxy vote. It is assumed that the owner of the nft has already transferred it to this contract.
        - Will revert if done by a non-owner
        - Will revert if the poolVotes don't match the weights
     */
    function vote(uint tokenId, address[] calldata _poolVote, int256[] calldata _weights) external lock {
        require(nftOwner[tokenId] == msg.sender, 'Not NFT owner');
        require(_poolVote.length == _weights.length, 'Invalid vote params');
        _vote(tokenId, _poolVote, _weights);
        IV1Voter(_v1Voter).vote(tokenId, _poolVote, _weights); 
    }

    /*
        Creates a new bribe. The assumption is the gauge is already created in V1 Voter
        - Validates if a pool has a gauge created
        - Creates a new v2bribe
     */
    function createBribe(address _gauge) external lock returns (address) {
        require(IV1Voter(_v1Voter).isGauge(_gauge), 'Gauge does not exist');
        address _pool = IV1Voter(_v1Voter).poolForGauge(_gauge);
        address _bribe = IV2BribeFactory(_v2BribeFactory).createBribe();
        bribes[_gauge] = _bribe;
        poolForGauge[_gauge] = _pool;
        _updateFor(_gauge);
        pools.push(_pool);
        return _bribe;
    }

    /*
        Withdraws the NFT 
        Also claims all bribes
     */
    function withdrawNFT() external lock {
        // Require that the token is being held by the contract
        // Requires that the token is owned by the msg.sender
        // claimBribes()
        // safeTransfer
        // nftOwner = address(0) 
    }

    function claimBribes(uint tokenId) public lock {
        // TODO Require that the tokenId is locked
        // Requires that the token is owned by the msg.sender
    }

    function onERC721Received(address operator, address from, uint256 tokenId, bytes memory data) public returns (bytes4) {
        return this.onERC721Received.selector;
    }
}