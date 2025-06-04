import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { Client, Presets } from 'userop';
import { PORT, NODE_ENV, IS_PRODUCTION, RENDER_EXTERNAL_URL } from './config/constants.js';
import transactionRoutes from './routes/transactionRoutes.js';
import { validateGaslessTransaction } from './middleware/gaslessValidation.js';
import { WebSocketHandler } from './events/websocketHandler.js';
import paymasterService from './services/paymasterService.js';


// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// Middleware
app.use(helmet({
  contentSecurityPolicy: IS_PRODUCTION ? undefined : false,
}));

app.use(cors({
  origin: IS_PRODUCTION ? [
    RENDER_EXTERNAL_URL,
    /\.render\.com$/,
    /localhost:\d+$/
  ] : true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  Logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Routes with gasless validation
app.use('/api/transactions', validateGaslessTransaction, transactionRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Gene Backend',
    version: '1.0.0',
    status: 'running',
    environment: NODE_ENV,
    gaslessTransactionType: 0,
    endpoints: {
      health: '/health',
      gaslessInfo: '/api/gasless-info',
      executeGasless: '/api/transactions/execute-gasless',
      sponsor: '/api/transactions/sponsor',
      estimateGas: '/api/transactions/estimate-gas'
    },
    websocket: 'enabled',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'gene-backend',
    gaslessTransactionType: 0,
    paymasterIntegration: 'active',
    environment: NODE_ENV,
    uptime: process.uptime()
  });
});

// Gasless transaction info endpoint
app.get('/api/gasless-info', (req, res) => {
  res.json({
    transactionType: 0,
    description: 'Type 0 gasless transactions sponsored by Paymaster',
    features: [
      'Zero gas fees for users',
      'Paymaster sponsorship via pm_sponsor_userop',
      'Real-time WebSocket support',
      'Automatic gas estimation'
    ],
    endpoints: {
      execute: '/api/transactions/execute-gasless',
      sponsor: '/api/transactions/sponsor',
      estimate: '/api/transactions/estimate-gas'
    },
    network: 'Nero Testnet',
    environment: NODE_ENV
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  Logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: IS_PRODUCTION ? 'Internal server error' : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api/gasless-info',
      'POST /api/transactions/execute-gasless',
      'POST /api/transactions/sponsor',
      'POST /api/transactions/estimate-gas'
    ]
  });
});

// Initialize WebSocket handler
const wsHandler = new WebSocketHandler(server);

// Initialize services and start server
async function startServer() {
  try {
    // Initialize Paymaster service
    await paymasterService.initialize();
    
    Logger.info('Paymaster service initialized for type 0 gasless transactions');
    
    server.listen(PORT, '0.0.0.0', () => {
      Logger.info(`Gene Backend server running on port ${PORT}`);
      Logger.info(`Environment: ${NODE_ENV}`);
      Logger.info('WebSocket server ready for gasless transaction connections');
      Logger.info('Type 0 gasless transactions enabled with Paymaster sponsorship');
      
      if (RENDER_EXTERNAL_URL) {
        Logger.info(`External URL: ${RENDER_EXTERNAL_URL}`);
      }
    });
  } catch (error) {
    Logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
const gracefulShutdown = (signal) => {
  Logger.info(`${signal} received, shutting down gracefully`);
  server.close(() => {
    Logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  Logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  Logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();

