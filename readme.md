A fork of https://github.com/solidlyexchange/solidly with reworked Bribe and Votes contracts (respectively, BribeV2-bribes and BribeV2-voter).

! BribeV2-voter
* Proxy contract that holds veSolid and votes on behalf of the owner
* Used to claim bribes from BribeV2-Bribes
* Used to create new bribes for a gauge

! BribeV2-bribes
* Mostly a copy and paste of the original BaseV1-bribes contract
* Used to keep track of how much veSolid holders earned when they withdraw
* Uses SNX staking mechanism

All keys are public.

