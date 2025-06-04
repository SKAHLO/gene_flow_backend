import { Client, Presets } from 'userop';
import { ethers } from 'ethers';
import {
  NERO_RPC_URL,
  BUNDLER_URL,
  PAYMASTER_URL,
  ENTRYPOINT_ADDRESS,
  ACCOUNT_FACTORY_ADDRESS,
  PAYMASTER_API_KEY
} from '../config/constants.js';

class PaymasterService {
  constructor() {
    this.client = null;
    this.provider = null;
    this.paymasterClient = null;
  }

  async initialize() {
    try {
      // Initialize the AA Client
      this.client = await Client.init(NERO_RPC_URL, {
        overrideBundlerRpc: BUNDLER_URL,
        entryPoint: ENTRYPOINT_ADDRESS,
      });

      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(NERO_RPC_URL);
      
      // Initialize Paymaster client
      this.paymasterClient = new ethers.JsonRpcProvider(PAYMASTER_URL);
      
      console.log('Paymaster service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Paymaster service:', error);
      throw error;
    }
  }

  async sponsorUserOperation(userOp) {
    try {
      // Call pm_sponsor_userop with type 0 for gasless transactions
      const sponsorResult = await this.paymasterClient.send('pm_sponsor_userop', [
        userOp,
        ENTRYPOINT_ADDRESS,
        {
          type: 0, 
          apikey: PAYMASTER_API_KEY
        }
      ]);

      return sponsorResult;
    } catch (error) {
      console.error('Error sponsoring user operation:', error);
      throw error;
    }
  }

  async createGaslessUserOperation(transactionData) {
    const {
      sender,
      target,
      value = "0x0",
      data = "0x",
      privateKey
    } = transactionData;

    try {
      // Create signer from private key
      const signer = new ethers.Wallet(privateKey, this.provider);

      // Get nonce for the sender
      const nonce = await this.getNonce(sender);

      // Encode call data for the transaction
      const callData = this.encodeCallData(target, value, data);

      // Create minimal UserOp with type 0 (gasless)
      const minimalUserOp = {
        sender: sender,
        nonce: nonce,
        initCode: "0x", // Empty for existing wallets
        callData: callData,
        callGasLimit: "0x0", // Will be estimated
        verificationGasLimit: "0x0", // Will be estimated
        preVerificationGas: "0x0", // Will be estimated
        maxFeePerGas: "0x0", // Will be set by paymaster
        maxPriorityFeePerGas: "0x0", // Will be set by paymaster
        paymasterAndData: "0x", // Will be filled by Paymaster
        signature: "0x", // Will be filled with signature
        type: 0 // Explicitly set type 0 for gasless transactions
      };

      // Estimate gas for the user operation
      const gasEstimates = await this.estimateUserOpGas(minimalUserOp);
      
      // Update user operation with gas estimates
      const userOpWithGas = {
        ...minimalUserOp,
        callGasLimit: gasEstimates.callGasLimit,
        verificationGasLimit: gasEstimates.verificationGasLimit,
        preVerificationGas: gasEstimates.preVerificationGas,
        maxFeePerGas: gasEstimates.maxFeePerGas,
        maxPriorityFeePerGas: gasEstimates.maxPriorityFeePerGas
      };

      // Get paymaster sponsorship with type 0
      const sponsorData = await this.sponsorUserOperation(userOpWithGas);
      
      // Update user operation with paymaster data
      const sponsoredUserOp = {
        ...userOpWithGas,
        paymasterAndData: sponsorData.paymasterAndData,
        maxFeePerGas: sponsorData.maxFeePerGas || userOpWithGas.maxFeePerGas,
        maxPriorityFeePerGas: sponsorData.maxPriorityFeePerGas || userOpWithGas.maxPriorityFeePerGas
      };

      // Sign the user operation
      const signature = await this.signUserOperation(sponsoredUserOp, signer);
      sponsoredUserOp.signature = signature;

      return sponsoredUserOp;
    } catch (error) {
      console.error('Error creating gasless user operation:', error);
      throw error;
    }
  }

  async executeGaslessTransaction(transactionData) {
    try {
      console.log('Creating type 0 gasless transaction for:', transactionData.sender);
      
      const userOp = await this.createGaslessUserOperation(transactionData);
      
      console.log('Gasless UserOp created with type 0:', {
        sender: userOp.sender,
        type: userOp.type,
        paymasterAndData: userOp.paymasterAndData !== "0x" ? "✓ Sponsored" : "✗ Not sponsored"
      });
      
      // Send the user operation
      const response = await this.client.sendUserOperation(userOp);
      
      console.log('Gasless transaction sent:', response);
      
      // Wait for transaction receipt
      const receipt = await response.wait();
      
      return {
        success: true,
        type: 0, 
        transactionHash: receipt.transactionHash,
        userOpHash: response.userOpHash,
        receipt: receipt,
        gasSponsored: true
      };
    } catch (error) {
      console.error('Error executing gasless transaction:', error);
      return {
        success: false,
        type: 0,
        error: error.message,
        gasSponsored: false
      };
    }
  }

  async estimateUserOpGas(userOp) {
    try {
      // Call eth_estimateUserOperationGas
      const gasEstimate = await this.client.estimateUserOperationGas(userOp);
      
      return {
        callGasLimit: gasEstimate.callGasLimit || "0x5208", // Default gas limit
        verificationGasLimit: gasEstimate.verificationGasLimit || "0x186A0",
        preVerificationGas: gasEstimate.preVerificationGas || "0x5208",
        maxFeePerGas: gasEstimate.maxFeePerGas || "0x59682F00", // 1.5 gwei
        maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas || "0x59682F00"
      };
    } catch (error) {
      console.error('Error estimating gas:', error);
      // Return default values for gasless transactions
      return {
        callGasLimit: "0x5208",
        verificationGasLimit: "0x186A0",
        preVerificationGas: "0x5208",
        maxFeePerGas: "0x0", // Will be covered by paymaster
        maxPriorityFeePerGas: "0x0"
      };
    }
  }

  async signUserOperation(userOp, signer) {
    try {
      // Create the hash to sign
      const userOpHash = await this.getUserOperationHash(userOp);
      
      // Sign the hash
      const signature = await signer.signMessage(ethers.getBytes(userOpHash));
      
      return signature;
    } catch (error) {
      console.error('Error signing user operation:', error);
      throw error;
    }
  }

  async getUserOperationHash(userOp) {
    try {
      // Call eth_getUserOperationHash
      const hash = await this.client.getUserOperationHash(userOp);
      return hash;
    } catch (error) {
      console.error('Error getting user operation hash:', error);
      // Fallback: create hash manually
      return this.createUserOperationHash(userOp);
    }
  }

  createUserOperationHash(userOp) {
    // Manual hash creation for user operation
    const packed = ethers.solidityPacked(
      ['address', 'uint256', 'bytes32', 'bytes32', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes32'],
      [
        userOp.sender,
        userOp.nonce,
        ethers.keccak256(userOp.initCode),
        ethers.keccak256(userOp.callData),
        userOp.callGasLimit,
        userOp.verificationGasLimit,
        userOp.preVerificationGas,
        userOp.maxFeePerGas,
        userOp.maxPriorityFeePerGas,
        ethers.keccak256(userOp.paymasterAndData)
      ]
    );
    
    return ethers.keccak256(packed);
  }

  async getNonce(address) {
    try {
      const nonce = await this.provider.getTransactionCount(address);
      return ethers.toBeHex(nonce);
    } catch (error) {
      console.error('Error getting nonce:', error);
      return "0x0";
    }
  }

  encodeCallData(target, value, data) {
    // Simple call data encoding for direct calls
    const iface = new ethers.Interface([
      "function execute(address target, uint256 value, bytes calldata data)"
    ]);
    
    return iface.encodeFunctionData("execute", [target, value, data]);
  }

  // Method to check if transaction is gasless (type 0)
  isGaslessTransaction(userOp) {
    return userOp.type === 0 && userOp.paymasterAndData !== "0x";
  }

  // Method to validate gasless transaction requirements
  validateGaslessTransaction(transactionData) {
    const { sender, target, privateKey } = transactionData;
    
    if (!sender || !target || !privateKey) {
      throw new Error('Missing required fields for gasless transaction');
    }

    // Validate Ethereum addresses
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(sender) || !addressRegex.test(target)) {
      throw new Error('Invalid Ethereum address format');
    }

    return true;
  }
}

export default new PaymasterService();
