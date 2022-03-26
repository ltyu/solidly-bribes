A fork of https://github.com/solidlyexchange/solidly with reworked Bribe and Votes contracts (respectively, BribeV2-bribes and BribeV2-voter).

BribeV2-voter
* Proxy contract that locks veSolid and votes on behalf of the owner
* Used to claim bribes from BribeV2-Bribes
* Used to create new bribes for a gauge
* Pausable contract

BribeV2-bribes
* Modification of the original BaseV1-bribes contract
* Used to add new rewards via notifyRewardAmount
* Used to keep track of how much veSolid holders earned when they withdraw
* Drips rewards out throughout the week

All keys are public.

