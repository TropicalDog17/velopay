const { LAMPORTS_PER_SOL, PublicKey } = require('@solana/web3.js');
const Axios = require('axios')
const { ethers, BigNumber } = require('ethers')
const SPENDER_1INCH = '0x1111111254eeb25477b68fb85ed929f73a960582' // by default approval would go to this address

const approveUrl = (chain) => `https://api.1inch.io/v5.0/${chain}/approve/transaction`;
const swapUrl = (chain) => `https://api.1inch.io/v5.0/${chain}/swap`;

const isERC20 = (token) => token === 'USDC' || token === 'USDT';

const constructSwapTransaction = (swapData) => {
  console.log('this is swap data', swapData);
  const pair = swapData.pair;

  return constructSolanaSwapTransaction(swapData)
  // if(isERC20(pair[0])) return constructERC20SwapTransaction(swapData);
  // else return constructNormalSwapTransaction(swapData);
}

const constructSolanaSwapTransaction = async (swapData) => {
  // const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  let transactions = [];

  const data = await (
    // await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${new PublicKey(swapData.tokenAddress1).toString()}\
    //   &outputMint=${new PublicKey(swapData.tokenAddress2).toString()}\
    //   &amount=${BigNumber(Number(swapData.amount) * LAMPORTS_PER_SOL).toString()}\
    //   &slippageBps=50`
    // )
    await fetch('https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000&slippageBps=1')
  ).json();
  const quoteResponse = data;
  console.log(quoteResponse)
  console.log("shit")

  // get serialized transactions for the swap
  const transaction = await (
    await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // quoteResponse from /quote api
        quoteResponse,
        // user public key to be used for the swap
        userPublicKey: new PublicKey(swapData.userAddress).toString(),
        // auto wrap and unwrap SOL. default is true
        wrapUnwrapSOL: true,
        // feeAccount is optional. Use if you want to charge a fee.  feeBps must have been passed in /quote API.
        // feeAccount: "fee_account_public_key"
      })
    })
  ).json();

  console.log(transaction)
  const { swapTransaction } = transaction


  // const swapTxn = {
  //   to: quoteResponse.data.tx.to,
  //   value: quoteResponse.data.tx.value,
  //   data: quoteResponse.data.tx.data
  // }

  transactions.push(swapTransaction);

  return {
    success: true,
    context: `This transactions would swap your ${swapData.amount} of sol token against ${swapData.pair[1]} token.`,
    transaction: transactions
  };
}

const constructNormalSwapTransaction = async (swapData) => {
  let transactions = [];

  const chain = swapData.chain;
    // swap transction
  let swapTransactionResp = await Axios.get(swapUrl(chain), {
    params: {
      fromTokenAddress: swapData.tokenAddress1,
      toTokenAddress: swapData.tokenAddress2,
      amount: ethers.utils
      .parseUnits(swapData.amount, 18)
      .toString(),
      fromAddress: swapData.userAddress,
      slippage: 5, // hardcoding it for now
      disableEstimate: true,
      destReceiver: swapData.userAddress
    }
  });

  const swapTxn = {
    to: swapTransactionResp.data.tx.to,
    value: swapTransactionResp.data.tx.value,
    data: swapTransactionResp.data.tx.data
  }

  transactions.push(swapTxn);

  console.log('thesre are txns ', transactions)

  return {
    success: true,
    context: `This transactions would swap your ${swapData.amount} of matic token against ${swapData.pair[1]} token.`,
    transaction: transactions
  };
}

const constructERC20SwapTransaction = async (swapData) => {
  /**
   * Data we need
   * 1. token pair // default to USDC and USDT
   * 2. token amount // by user
   */

  const chain = swapData.chain;

  let transactions = [];
  console.log('this is swap data ', swapData);

  // first give approval to 1inch router for the transaction
  let approvalTxnResp = await Axios.get(approveUrl(chain), {
    params: {
      tokenAddress: swapData.tokenAddress1,
      amount: ethers.utils
      .parseUnits(swapData.amount, 6)
      .toString()
    }
  });

  transactions.push(approvalTxnResp.data);
  // console.log(approvalTxnResp.data);
  console.log('these are params ', {
    fromTokenAddress: swapData.tokenAddress1,
    toTokenAddress: swapData.tokenAddress2,
    amount: ethers.utils
    .parseUnits(swapData.amount, 6)
    .toString(),
    fromAddress: swapData.userAddress,
    slippage: 40, // hardcoding it for now
    disableEstimate: true,
    // destReceiver: swapData.userAddress
  })
  // swap transction
  let swapTransactionResp = await Axios.get(swapUrl(chain), {
    params: {
      fromTokenAddress: swapData.tokenAddress1,
      toTokenAddress: swapData.tokenAddress2,
      amount: ethers.utils
      .parseUnits(swapData.amount, 6)
      .toString(),
      fromAddress: swapData.userAddress,
      slippage: 40, // hardcoding it for now
      disableEstimate: true,
      // destReceiver: swapData.userAddress
    }
  })

  console.log(swapTransactionResp)

  const swapTxns = {
    to: swapTransactionResp.data.tx.to,
    value: swapTransactionResp.data.tx.value,
    data: swapTransactionResp.data.tx.data,
    gasPrice: swapTransactionResp.data.tx.gasPrice
  }

  transactions.push(swapTxns);

  return {
    success: true,
    context: `The first transaction would take approval for ${swapData.amount} of ${swapData.pair[0]} token and then it would swap ${swapData.amount} of ${swapData.pair[0]} token for best rates`,
    transaction: transactions
  }
}

module.exports = { constructSwapTransaction }