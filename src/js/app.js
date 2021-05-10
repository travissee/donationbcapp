App = {
  web3Provider: null,
  contracts: {},

  init: async function () {
    // loads donation and redemption information
    $.getJSON('../donation.json', function (data) {
      var donateRow = $('#donateRow');
      var donateTemplate = $('#donateTemplate');

      for (i = 0; i < data.length; i++) {
        donateTemplate.find('img').attr('src', data[i].picture);
        donateTemplate.find('.donation-title').text(data[i].pname);
        donateTemplate.find('.donation-name').text(data[i].oname);
        donateTemplate.find('.donation-desc').text(data[i].description);
        donateTemplate.find('.donation-form').attr('id', 'donation' + data[i].id);

        donateRow.append(donateTemplate.html());
      }
    });
    $.getJSON('../redemption.json', function (data) {
      var redeemRow = $('#redeemRow');
      var redeemTemplate = $('#redeemTemplate');

      for (i = 0; i < data.length; i++) {
        redeemTemplate.find('img').attr('src', data[i].picture);
        redeemTemplate.find('.redemption-title').text(data[i].iname);
        redeemTemplate.find('.redemption-org').text(data[i].oname);
        redeemTemplate.find('.redemption-btn').attr('data-pog', data[i].cost);
        redeemTemplate.find('.redemption-value').text(data[i].cost);

        redeemRow.append(redeemTemplate.html());
      }
    });
    return await App.initWeb3();
  },

  initWeb3: async function () {
    // connect to browser-synced ethereum account (Metamask)
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      // wait for approval to connect to ethereum account
      try {
        await window.ethereum.enable();
      } catch (error) {
        console.error("User denied account access")
      }
    }
    // obsolete browser-synced connection method for Metamask (no approval required)
    else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    }
    // point to local network to connect to ethereum account (Ganache)
    else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    }
    web3 = new Web3(App.web3Provider);
    $('#account').css('display', 'none');
    $('#developer').css('display', 'none');
    return App.initContract();
  },

  initContract: function () {
    $.getJSON('DonationService.json', function (data) {
      // get contract artifact file, instantise it with truffle-contract and set provider to connected ethereum account
      var DonationServiceArtifact = data;
      App.contracts.DonationService = TruffleContract(DonationServiceArtifact);
      App.contracts.DonationService.setProvider(App.web3Provider);
    });
    return App.updateFee();
  },

  updateFee: function () {
    var DonationServiceInstance;
    var account;
    // call web3 getAccounts function to retrieve the connected etherum accounts
    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }
      account = accounts[0];
      // retrieve deployed contract and get a javascript instance
      App.contracts.DonationService.deployed().then(function (instance) {
        DonationServiceInstance = instance;
        // call function placeDonation from contract with previously retrieved id as parameter, account and value as arguments
        return DonationServiceInstance.showFee({ from: account });
      }).then(function (fee) {
        var feeString = fee.toString();
        $('#fee').text(feeString);
      }).catch(function (err) {
        console.log(err.message);
      });
    });
    return App.bindEvents();
  },

  // listens to following events and call corresponding functions
  bindEvents: function () {
    $(document).on('click', '.web3-btn', App.initWeb3);
    $(document).on('click', '.acct-btn', App.accountTab);
    $(document).on('click', '.developer-btn', App.developerTab);
    $(document).on('click', '.redemption-btn', App.handleRedemption);
    $(document).on('click', '.withdraw-btn', App.handleWithdrawal);
    $(document).on('click', '.charity-btn', App.showCharity);
    $(document).on('click', '.fee-btn', App.showFee);
  },

  // updates information in Account Tab
  accountTab: function () {
    var DonationServiceInstance;
    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }
      // declare all variables to be retrieved
      var account = accounts[0];
      var ethUSD;
      var ethBalance;
      var usdBalance;
      var totalDonation;
      var totalDonationUSD;
      var tokenBalance;
      var tokenRedeemed;
      web3.eth.getBalance(account, async function (error, balance) {
        if (error) {
          console.log(error);
        }
        ethBalance = web3.fromWei(balance, 'ether');
        // retrieve eth/usd price from coin gecko api
        await $.getJSON("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd", function (dataJSON) {
          ethUSD = dataJSON["ethereum"]["usd"];
        });
        usdBalance = (ethBalance * ethUSD).toFixed(2);
        // retrieve deployed contract and get a javascript instance
        App.contracts.DonationService.deployed().then(function (instance) {
          DonationServiceInstance = instance;
          // call function showTotalDonationETH from contract which returns the total donation made in wei
          return DonationServiceInstance.showTotalDonationETH.call(account);
        }).then(function (totalDonationWei) {
          var totalDonationETH = web3.fromWei(totalDonationWei, 'ether');
          totalDonation = totalDonationETH.toString();
          return DonationServiceInstance.showTotalDonationUSD.call(account);
        }).then(function (tDonationUSD) {
          totalDonationUSD = tDonationUSD.toFixed(2);
          // call function showTokenBal from contract which returns the token balance
          return DonationServiceInstance.showTokenBal.call(account);
        }).then(function (tokenBal) {
          tokenBalance = tokenBal.toString();
          // call function showTokenRedeemed from contract which returns the token balance
          return DonationServiceInstance.showTokenRedeemed.call(account);
        }).then(function (tokenRedmn) {
          tokenRedeemed = tokenRedmn.toString();
        }).then(function () {
          $('#acct-wallet').text(account);
          $('#acct-eth').text(ethBalance + ' ETH (' + usdBalance + ' USD)');
          $('#acct-tdonation').text(totalDonation + ' ETH (' + totalDonationUSD + ' USD)');
          $('#acct-bal').text(tokenBalance);
          $('#acct-redmn').text(tokenRedeemed);
        }).catch(function (err) {
          console.log(err.message);
        });
      });
    });
  },

  // updates information in Developer Tab
  developerTab: function () {
    var DonationServiceInstance;
    web3.eth.getAccounts(async function (error, accounts) {
      if (error) {
        console.log(error);
      }
      var account = accounts[0];
      var ethUSD;
      var usdContract;
      // retrieve eth/usd price from coin gecko api
      await $.getJSON("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd", function (dataJSON) {
        ethUSD = dataJSON["ethereum"]["usd"];
      });
      // retrieve deployed contract and get a javascript instance
      App.contracts.DonationService.deployed().then(function (instance) {
        DonationServiceInstance = instance;
        // call function showContractETHBal from contract which returns the total donation made in wei
        return DonationServiceInstance.showContractETHBal.call(account);
      }).then(function (contractBalWei) {
        var contractBalETH = web3.fromWei(contractBalWei, 'ether');
        ethContract = contractBalETH.toString();
        usdContract = (ethContract * ethUSD).toFixed(2);
      }).then(function () {
        $('#contract-deth').text(ethContract + ' ETH (' + usdContract + ' USD)');
        $('#contract-ceth').text(ethContract + ' ETH (' + usdContract + ' USD)');
      }).catch(function (err) {
        console.log(err.message);
      });

    });
  },

  // function to donate to charity
  handleDonation: async function (event) {
    // Optional
    event.preventDefault();
    var charityIndex = parseInt(event.target.id.substring(8));
    var usdAmt = $('input[donation-id]', event.target).val();
    var DonationServiceInstance;
    var account;
    var ethUSD;
    // retrieve eth/usd price from coin gecko api
    await $.getJSON("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd", function (dataJSON) {
      ethUSD = dataJSON["ethereum"]["usd"];
    });
    var ethAmt = usdAmt / ethUSD;
    var weiValue = web3.toWei(ethAmt, 'ether');
    // call web3 getAccounts function to retrieve the connected etherum accounts
    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }
      account = accounts[0];
      // retrieve deployed contract and get a javascript instance
      App.contracts.DonationService.deployed().then(function (instance) {
        DonationServiceInstance = instance;
        // call function placeDonation from contract with previously retrieved id as parameter, account and value as arguments
        DonationServiceInstance.placeDonation(charityIndex, usdAmt, { from: account, value: weiValue });
        return $('input[donation-id]', event.target).val('');
      }).catch(function (err) {
        console.log(err.message);
      });
    });
  },


  // function to redeem tokens
  handleRedemption: function (event) {
    // Optional
    event.preventDefault();
    // retrieve the value in event and parse the result from string to integer
    var costPOG = parseInt($(event.target).data('pog'));
    var DonationServiceInstance;
    var account;
    // call web3 getAccounts function to retrieve the connected etherum accounts
    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }
      account = accounts[0];
      // retrieve deployed contract and get a javascript instance
      App.contracts.DonationService.deployed().then(function (instance) {
        DonationServiceInstance = instance;
        // call function placeDonation from contract with previously retrieved id as parameter, account and value as arguments
        return DonationServiceInstance.redeemToken(costPOG, { from: account });
      }).catch(function (err) {
        console.log(err.message);
      });
    });
  },

  // function to withdraw eth balance in contract
  handleWithdrawal: function (event) {
    // Optional
    event.preventDefault();
    // retrieve the id in event and parse the result from string to integer and convert to wei equivalent
    var DonationServiceInstance;
    var account;
    // call web3 getAccounts function to retrieve the connected etherum accounts
    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }
      account = accounts[0];
      // retrieve deployed contract and get a javascript instance
      App.contracts.DonationService.deployed().then(function (instance) {
        DonationServiceInstance = instance;
        // call function placeDonation from contract with previously retrieved id as parameter, account and value as arguments
        DonationServiceInstance.withdrawETH({ from: account });
        return $('#developer').css('display', 'none');
      }).catch(function (err) {
        console.log(err.message);
      });
    });
  },

  // function to show all charities (owner-only function)
  showCharity: function () {
    var DonationServiceInstance;
    var account;
    // call web3 getAccounts function to retrieve the connected etherum accounts
    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }
      account = accounts[0];
      // retrieve deployed contract and get a javascript instance
      App.contracts.DonationService.deployed().then(function (instance) {
        DonationServiceInstance = instance;
        // call function placeDonation from contract with previously retrieved id as parameter, account and value as arguments
        return DonationServiceInstance.showCharity({ from: account });
      }).then(function (charitiesArray) {
        var charitiesString = charitiesArray.toString();
        console.log(charitiesString);
        return alert(charitiesString);
      }).catch(function (err) {
        console.log(err.message);
      });
    });
  },

  // function to show current fee (owner-only function)
  showFee: function () {
    var DonationServiceInstance;
    var account;
    // call web3 getAccounts function to retrieve the connected etherum accounts
    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }
      account = accounts[0];
      // retrieve deployed contract and get a javascript instance
      App.contracts.DonationService.deployed().then(function (instance) {
        DonationServiceInstance = instance;
        // call function placeDonation from contract with previously retrieved id as parameter, account and value as arguments
        return DonationServiceInstance.showFee({ from: account });
      }).then(function (fee) {
        var feeString = fee.toString();
        console.log(feeString);
        return alert(feeString);
      }).catch(function (err) {
        console.log(err.message);
      });
    });
  },

  // function to add new charity (owner-only function)
  handleAddCharity: function () {
    // retrieve the value in event and parse the result from string to integer
    var charity = document.getElementById('addcharity-text').value;
    var DonationServiceInstance;
    var account;
    // call web3 getAccounts function to retrieve the connected etherum accounts
    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }
      account = accounts[0];
      // retrieve deployed contract and get a javascript instance
      App.contracts.DonationService.deployed().then(function (instance) {
        DonationServiceInstance = instance;
        // call function placeDonation from contract with previously retrieved id as parameter, account and value as arguments
        DonationServiceInstance.addCharity(charity, { from: account });
        document.getElementById('addcharity-text').value = '';
        return $('#developer').css('display', 'none');
      }).catch(function (err) {
        console.log(err.message);
      });
    });
  },

  // function to change fee rate (owner-only function)
  handleChangeFee: function () {
    // retrieve the value in event and parse the result from string to integer
    var fee = parseInt(document.getElementById('changefee-text').value);
    var DonationServiceInstance;
    var account;
    // call web3 getAccounts function to retrieve the connected etherum accounts
    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }
      account = accounts[0];
      // retrieve deployed contract and get a javascript instance
      App.contracts.DonationService.deployed().then(function (instance) {
        DonationServiceInstance = instance;
        // call function placeDonation from contract with previously retrieved id as parameter, account and value as arguments
        DonationServiceInstance.changeFee(fee, { from: account });
        document.getElementById('changefee-text').value = '';
        return $('#developer').css('display', 'none');
      }).catch(function (err) {
        console.log(err.message);
      });
    });
  },
};

// upon window loads, call function App.init
$(function () {
  $(window).load(function () {
    App.init();
  });
});
