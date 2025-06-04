// Chain configuration
export const NERO_RPC_URL = "https://rpc-testnet.nerochain.io";
export const BUNDLER_URL = "https://bundler-testnet.nerochain.io/";
export const PAYMASTER_URL = "https://paymaster-testnet.nerochain.io";

// Contract addresses
export const ENTRYPOINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
export const ACCOUNT_FACTORY_ADDRESS = "0x9406Cc6185a346906296840746125a0E44976454";

// Server configuration - Use Render's PORT environment variable
export const PORT = process.env.PORT || 3000;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const PAYMASTER_API_KEY = process.env.PAYMASTER_API_KEY;

// Render-specific configurations
export const IS_PRODUCTION = NODE_ENV === 'production';
export const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
