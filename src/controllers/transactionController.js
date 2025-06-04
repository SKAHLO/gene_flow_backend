import paymasterService from '../services/paymasterService.js';

export class TransactionController {
  async executeGaslessTransaction(req, res) {
    try {
      const { sender, target, value, data, privateKey } = req.body;

      // Validate gasless transaction requirements
      paymasterService.validateGaslessTransaction({ sender, target, privateKey });

      const transactionData = {
        sender,
        target,
        value: value || "0x0",
        data: data || "0x",
        privateKey
      };

      console.log('Processing type 0 gasless transaction request for:', sender);

      const result = await paymasterService.executeGaslessTransaction(transactionData);
      
      if (result.success) {
        console.log('Type 0 gasless transaction successful:', result.transactionHash);
        res.json({
          ...result,
          message: 'Gasless transaction (type 0) executed successfully'
        });
      } else {
        console.error('Type 0 gasless transaction failed:', result.error);
        res.status(500).json({
          ...result,
          message: 'Gasless transaction (type 0) failed'
        });
      }
    } catch (error) {
      console.error('Gasless transaction execution error:', error);
      res.status(500).json({
        success: false,
        type: 0,
        error: error.message,
        gasSponsored: false
      });
    }
  }

  async sponsorUserOperation(req, res) {
    try {
      const { userOp } = req.body;
      
      
      const gaslessUserOp = {
        ...userOp,
        type: 0
      };

      const sponsorData = await paymasterService.sponsorUserOperation(gaslessUserOp);
      
      res.json({
        success: true,
        type: 0,
        sponsorData,
        message: 'UserOp sponsored successfully with type 0'
      });
    } catch (error) {
      console.error('UserOp sponsorship error:', error);
      res.status(500).json({
        success: false,
        type: 0,
        error: error.message
      });
    }
  }

  async estimateGas(req, res) {
    try {
      const transactionData = req.body;
      const userOp = await paymasterService.createGaslessUserOperation(transactionData);
      const gasEstimate = await paymasterService.estimateUserOpGas(userOp);
      
      res.json({
        success: true,
        type: 0,
        gasEstimate,
        gasSponsored: paymasterService.isGaslessTransaction(userOp)
      });
    } catch (error) {
      console.error('Gas estimation error:', error);
      res.status(500).json({
        success: false,
        type: 0,
        error: error.message
      });
    }
  }

  async getTransactionStatus(req, res) {
    try {
      const { userOpHash } = req.params;
      
      // Depends on the specific bundler API
      res.json({
        success: true,
        type: 0,
        status: 'pending',
        userOpHash,
        gasless: true
      });
    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({
        success: false,
        type: 0,
        error: error.message
      });
    }
  }
}

export default new TransactionController();
