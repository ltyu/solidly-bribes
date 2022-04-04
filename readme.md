A fork of https://github.com/solidlyexchange/solidly Bribe and Votes contracts (respectively, BribeV2-bribes and BribeV2-voter).

BribeV2-voter
* Proxy contract that locks veSolid for 10 days and votes on behalf of the owner
* Used to claim bribes from BribeV2-Bribes
* Used to create new bribes for a gauge
* Pausable contract

BribeV2-bribes
* Modification of the original BaseV1-bribes contract
* Used to add rewards to an existing bribe via notifyRewardAmount
* Used to keep track of how much veSolid holders earned when they withdraw
* Drips rewards out throughout the week

Migration
* Since V2 voting will require V2 bribes to be created for existing pairs **migration.js** will need to be run. The script should create a V2 bribe for existing pairs. In the future, new pairs created will have V2 bribe created when adding liquidity on the frontend.
