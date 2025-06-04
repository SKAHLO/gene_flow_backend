import { Server } from 'socket.io';
import paymasterService from '../services/paymasterService.js';

export class WebSocketHandler {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Listen for type 0 gasless transaction requests
      socket.on('execute-gasless-transaction', async (data) => {
        try {
          console.log('Received type 0 gasless transaction request:', data);
          
          
          const gaslessData = {
            ...data,
            type: 0
          };
          
          const result = await paymasterService.executeGaslessTransaction(gaslessData);
          
          // Emit result back to client
          socket.emit('transaction-result', {
            requestId: data.requestId,
            type: 0,
            gasless: true,
            ...result
          });

          // Broadcast to all connected clients
          this.io.emit('transaction-broadcast', {
            type: 0,
            transactionType: 'gasless-transaction',
            sender: data.sender,
            success: result.success,
            hash: result.transactionHash,
            gasSponsored: result.gasSponsored,
            timestamp: new Date().toISOString()
          });

        } catch (error) {
          console.error('WebSocket gasless transaction error:', error);
          socket.emit('transaction-error', {
            requestId: data.requestId,
            type: 0,
            error: error.message,
            gasSponsored: false
          });
        }
      });

      // Listen for user operation sponsorship requests
      socket.on('sponsor-userop', async (data) => {
        try {
          console.log('Received sponsor UserOp request with type 0:', data);
          
          
          const userOpWithType = {
            ...data.userOp,
            type: 0
          };

          const sponsorResult = await paymasterService.sponsorUserOperation(userOpWithType);
          
          socket.emit('sponsor-result', {
            requestId: data.requestId,
            type: 0,
            success: true,
            sponsorData: sponsorResult,
            message: 'UserOp sponsored with type 0 (gasless)'
          });
        } catch (error) {
          console.error('WebSocket sponsor error:', error);
          socket.emit('sponsor-error', {
            requestId: data.requestId,
            type: 0,
            error: error.message
          });
        }
      });

      // Listen for gas estimation requests for type 0 transactions
      socket.on('estimate-gas', async (data) => {
        try {
          console.log('Received gas estimation request for type 0 transaction:', data);
          
          const userOp = await paymasterService.createGaslessUserOperation(data);
          const gasEstimate = await paymasterService.estimateUserOpGas(userOp);
          
          socket.emit('gas-estimate-result', {
            requestId: data.requestId,
            type: 0,
            gasEstimate,
            gasSponsored: paymasterService.isGaslessTransaction(userOp)
          });
        } catch (error) {
          socket.emit('gas-estimate-error', {
            requestId: data.requestId,
            type: 0,
            error: error.message
          });
        }
      });

      // Listen for transaction status requests
      socket.on('get-transaction-status', async (data) => {
        try {
          const { userOpHash } = data;
          
          socket.emit('transaction-status-result', {
            requestId: data.requestId,
            type: 0,
            userOpHash,
            status: 'pending', 
            gasless: true
          });
        } catch (error) {
          socket.emit('transaction-status-error', {
            requestId: data.requestId,
            type: 0,
            error: error.message
          });
        }
      });

      // Handle client disconnect
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  // Broadcast gasless transaction updates
  broadcastGaslessTransactionUpdate(transactionData) {
    this.io.emit('gasless-transaction-update', {
      type: 0,
      ...transactionData,
      timestamp: new Date().toISOString()
    });
  }

  // Broadcast paymaster sponsorship updates
  broadcastSponsorshipUpdate(sponsorshipData) {
    this.io.emit('sponsorship-update', {
      type: 0,
      ...sponsorshipData,
      timestamp: new Date().toISOString()
    });
  }
}
