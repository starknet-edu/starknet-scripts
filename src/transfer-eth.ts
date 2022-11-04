import {
  Account,
  Contract,
  ec,
  uint256,
  Provider,
  json,
  number,
  stark
} from "starknet";
import fs from "fs"
import * as dotenv from 'dotenv'

dotenv.config();

const PROVIDER_URL = process.env.STARKNET_PROVIDER_BASE_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PROVIDER_URL || !PRIVATE_KEY) {
  console.error("Warning!! Please setup your .env file.")
  process.exit()
}

// Provider config
const provider = new Provider({
  sequencer: {
    baseUrl: PROVIDER_URL,
  },
});

const privateKey = PRIVATE_KEY; //get private key from .env
const starkKeyPair = ec.getKeyPair(privateKey)// get starkKeyPair from the private key
const fromAddress = "0x02171a7c4c31ab917b380b0218ecd12162616bea80bb1c9b2f8ec43628eb2601" // Config from address
const toAddress = "0x063dcf25d2b946dec82730a49145ae2c821824f4a947935547fc74cf726b6c5a"// Config to address
const ethAddress = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"// ETH contract address
const TRANSFER_AMOUNT = "10000000000000000" //0.01 eth
const transferAmount = uint256.bnToUint256(number.toBN(TRANSFER_AMOUNT))
const recipient = number.toFelt(toAddress)

// From account config
const account = new Account(
  provider,
  fromAddress,
  starkKeyPair
);

// erc20 ABI
const erc20ABI = json.parse(
  fs.readFileSync("./ERC20.json").toString("ascii")
);
const erc20 = new Contract(erc20ABI, ethAddress, provider);
erc20.connect(account);

// Check balance
console.log(`Calling StarkNet for account balance...`);
const balanceBeforeTransfer = await erc20.balanceOf(account.address);
console.log(
  `account Address ${account.address} has a balance of:`,
  number.toBN(balanceBeforeTransfer.balance.low, 16).toString()
);

// Execute tx transfer 0.01 eth tokens
console.log(`Invoke Tx - Transfer eth tokens to recipient address ...`);
// Get nounce
const nonce = await getNonce()
// Config transactions
const transactions = {
  contractAddress: ethAddress,
  entrypoint: 'transfer',
  calldata: [recipient, transferAmount.low, transferAmount.high],
}

// Get estimated fees
const { suggestedMaxFee } = await account.estimateFee(transactions)
const maxFee = number.toHex(stark.estimatedFeeToMaxFee(suggestedMaxFee, 1))


// execute txn
const { transaction_hash: transferTxHash } = await account.execute(transactions, undefined, {
  nonce,
  maxFee,
})
console.log("transferTxHash", transferTxHash)

// Wait for the invoke transaction to be accepted on StarkNet
console.log(`Waiting for Tx to be Accepted on Starknet - Transfer...`);
await provider.waitForTransaction(transferTxHash);

// Check balance after transfer
console.log(`Calling StarkNet for account balance...`);
const balanceAfterTransfer = await erc20.balanceOf(account.address);
console.log("balanceAfterTransfer", number.toBN(balanceAfterTransfer.balance.low, 16).toString())

async function getNonce(): Promise<string> {
  const result = await account.getNonce()
  const nonceBn = number.toBN(result)
  return number.toHex(nonceBn)
}