import { PAYMASTER_URL, PAYMASTER_API_KEY } from './constants.js';

export const PAYMASTER_CONFIG = {
  // Type 0 configuration for gasless transactions
  GASLESS_TRANSACTION_TYPE: 0,
  
  
  SPONSOR_CONTEXT: {
    type: 0, // 
    apikey: PAYMASTER_API_KEY
  },

  
  RPC_METHODS: {
    SPONSOR_USEROP: 'pm_sponsor_userop',
    GET_PAYMASTER_DATA: 'pm_getPaymasterData',
    ESTIMATE_GAS: 'pm_estimateUserOperationGas'
  },

  
  DEFAULT_GAS_VALUES: {
    callGasLimit: "0x5208",
    verificationGasLimit: "0x186A0",
    preVerificationGas: "0x5208",
    maxFeePerGas: "0x0", 
    maxPriorityFeePerGas: "0x0"
  },

  // Validation rules for gasless transactions
  VALIDATION_RULES: {
    requirePaymasterSponsorship: true,
    enforceType0: true,
    validateGasEstimates: true
  }
};
