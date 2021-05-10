const DonationService = artifacts.require('DonationService');

module.exports = function (deployer) {
    deployer.deploy(DonationService);
};