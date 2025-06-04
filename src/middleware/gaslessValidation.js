export const validateGaslessTransaction = (req, res, next) => {
  const { sender, target, privateKey } = req.body;
  
  // Validate required fields for type 0 gasless transactions
  if (!sender || !target || !privateKey) {
    return res.status(400).json({
      success: false,
      type: 0,
      error: 'Missing required fields for gasless transaction: sender, target, privateKey'
    });
  }

  // Validate Ethereum addresses
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!addressRegex.test(sender) || !addressRegex.test(target)) {
    return res.status(400).json({
      success: false,
      type: 0,
      error: 'Invalid Ethereum address format'
    });
  }

  // Validate private key format
  const privateKeyRegex = /^0x[a-fA-F0-9]{64}$/;
  if (!privateKeyRegex.test(privateKey)) {
    return res.status(400).json({
      success: false,
      type: 0,
      error: 'Invalid private key format'
    });
  }

  
  req.body.type = 0;
  
  next();
};

export const validateSponsorRequest = (req, res, next) => {
  const { userOp } = req.body;
  
  if (!userOp) {
    return res.status(400).json({
      success: false,
      type: 0,
      error: 'Missing userOp in request body'
    });
  }

  
  req.body.userOp.type = 0;
  
  next();
};
