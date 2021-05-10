// SPDX-License-Identifier: MIT

pragma solidity ^0.7.5;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DonationService is ERC20 {
    // set deployer address as variable owner, create array of charities' address and set fee as 1%
    address public owner = msg.sender;
    address[] internal charities;
    uint256 public fee = 1;
    // create mapping array for deployer's and charities' wallet to balance (in ETH)
    mapping(address => uint256) internal ethBalance;
    // create mapping array for donator's wallet to total donation amount given (in ETH)
    mapping(address => uint256) internal totalDonationETH;
    // create mapping array for donator's wallet to total donation amount given (in USD)
    mapping(address => uint256) internal totalDonationUSD;
    // create mapping array for donator's wallet to token balance
    mapping(address => uint256) internal tokenBal;
    // create mapping array for donator's wallet to total number of tokens used
    mapping(address => uint256) internal tokenUsed;

    // contruct the token with name, symbol and set as default 18 decimals
    constructor() ERC20("PeaceofGiving Token", "POG") {}

    // function to send ether to smart contract in exchange for token upon donation
    function placeDonation(uint256 charityIndex, uint256 usdDonated)
        public
        payable
    {
        require(msg.value != 0, "No ETH is transferred");
        // set caller as variable donator and message value as variable donation
        address donator = msg.sender;
        uint256 donation = msg.value;
        uint256 donationOwner = (donation * fee) / 100;
        uint256 donationCharity = donation - donationOwner;
        // retrieve charity's address with provided index in charities array
        address charity = charities[charityIndex];
        // add amount to charity in ethBalance mapping array
        ethBalance[owner] += donationOwner;
        ethBalance[charity] += donationCharity;
        // add amount to caller in totalDonationETH mapping array
        totalDonationETH[donator] += donation;
        // add amount to caller in totalDonationUSD mapping array
        totalDonationUSD[donator] += usdDonated;
        // add amount to caller in tokenBal mapping array
        tokenBal[donator] += usdDonated;
        // create tokens and tag to caller address
        _mint(donator, usdDonated);
    }

    // function to destroy tokens upon redemption
    function redeemToken(uint256 tokenRedeem) public {
        // set caller as variable donator
        address donator = msg.sender;
        // guard check to ensure donator token balance is sufficient
        require(tokenBal[donator] >= tokenRedeem, "Insufficient POG tokens");
        // add tokens to caller in tokenUsed mapping array
        tokenUsed[donator] += tokenRedeem;
        // deduct amount to caller in tokenBal mapping array
        tokenBal[donator] -= tokenRedeem;
        // destroy the tokens tagged to caller
        _burn(donator, tokenRedeem);
    }

    //function to withdraw ether balance in smart contract
    function withdrawETH() public {
        // set caller as payable variable acct
        address payable acct = msg.sender;
        // retrieve ether balance for caller in ethBalance mapping array
        uint256 balanceETH = ethBalance[acct];
        // guard check to ensure the retrieved ether balance is more than 0 and not more than contract balance
        require(balanceETH != 0, "No ether stored in contract");
        require(address(this).balance >= balanceETH);
        // deduct amount for caller in ethBalance mapping array
        ethBalance[acct] -= balanceETH;
        // transfer ether balance to caller
        acct.transfer(balanceETH);
    }

    /*
    

    // series of get functions to retrieve data
    // function to return total donations given in ETH
    function showTotalDonationETH(address donator)
        public
        view
        returns (uint256)
    {
        return totalDonationETH[donator];
    }

    // function to return total donations given in USD
    function showTotalDonationUSD(address donator)
        public
        view
        returns (uint256)
    {
        return totalDonationUSD[donator];
    }

    // function to return token balance
    function showTokenBal(address donator) public view returns (uint256) {
        return tokenBal[donator];
    }

    // function to return token redeemed
    function showTokenRedeemed(address donator) public view returns (uint256) {
        return tokenUsed[donator];
    }

    // function to return ETH balance in contract
    function showContractETHBal(address charity) public view returns (uint256) {
        return ethBalance[charity];
    }

        // function to current fee rate in contract
    function showFee() public view returns (uint256) {
        return fee;
    }

    // series of deployer-only functions
    // function for deployer to change fee percentage
    function changeFee(uint256 newFee) public onlyOwner {
        fee = newFee;
    }

    // function for deployer to add charity address
    function addCharity(address charity) public onlyOwner {
        charities.push(charity);
    }

    // function to return charities array
    function showCharity() public view onlyOwner returns (address[] memory) {
        return charities;
    }

    // modifier to ensure that msg.sender is deployer
    modifier onlyOwner {
        require(msg.sender == owner, "Only the owner can call this function.");
        _;
    }
}
