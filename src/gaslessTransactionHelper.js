import { ethers } from 'ethers';

export class GaslessTransactionHelper {
  static createType0UserOp(transactionData) {
    const { sender, target, value = "0x0", data = "0x", nonce = "0x0" } = transactionData;
    
    return {
      sender,
      nonce,
      initCode: "0x",
      callData: this.encodeCallData(target, value, data),
      callGasLimit: "0x0",
      verificationGasLimit: "0x0",
      preVerificationGas: "0x0",
      maxFeePerGas: "0x0",
      maxPriorityFeePerGas: "0x0",
      paymasterAndData: "0x",
      signature: "0x",
      type: 0 
    };
  }

  static encodeCallData(target, value, data) {
    const iface = new ethers.Interface([
      "function execute(address target, uint256 value, bytes calldata data)"
    ]);
    
    return iface.encodeFunctionData("execute", [target, value, data]);
  }

  static validateGaslessUserOp(userOp) {
    const requiredFields = ['sender', 'nonce', 'callData', 'type'];
    
    for (const field of requiredFields) {
      if (!userOp[field] && userOp[field] !== 0) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (userOp.type !== 0) {
      throw new Error('Invalid transaction type. Must be type 0 for gasless transactions');
    }

    return true;
  }

  static isGaslessTransaction(userOp) {
    return userOp.type === 0 && userOp.paymasterAndData !== "0x";
  }

  static formatGaslessResponse(result, userOpHash, transactionHash) {
    return {
      success: result.success,
      type: 0,
      gasless: true,
      userOpHash,
      transactionHash,
      gasSponsored: true,
      timestamp: new Date().toISOString(),
      message: 'Gasless transaction (type 0) completed'
    };
  }
}
