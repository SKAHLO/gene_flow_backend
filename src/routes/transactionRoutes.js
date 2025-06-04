import express from 'express';
import transactionController from '..src/controllers/transactionController.js';

const router = express.Router();

// Execute gasless transaction (type 0)
router.post('/execute-gasless', transactionController.executeGaslessTransaction);

// Sponsor a user operation with type 0
router.post('/sponsor', transactionController.sponsorUserOperation);

// Estimate gas for gasless transaction
router.post('/estimate-gas', transactionController.estimateGas);

// Get transaction status
router.get('/status/:userOpHash', transactionController.getTransactionStatus);

export default router;
