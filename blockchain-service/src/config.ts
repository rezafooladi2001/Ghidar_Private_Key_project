/**
 * Configuration module for blockchain-service.
 * Reads all configuration from environment variables.
 */

export interface Config {
  port: number;
  phpBackendBaseUrl: string;
  paymentsCallbackToken: string;
  db: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
  rpc: {
    eth: string;
    bsc: string;
    tron: string;
  };
  usdtContracts: {
    erc20: string;
    bep20: string;
    trc20: string;
  };
  depositMnemonics: {
    eth: string;
    bsc: string;
    tron: string;
  };
}

/**
 * Load and validate configuration from environment variables.
 */
export function loadConfig(): Config {
  const port = parseInt(process.env.PORT || '4000', 10);
  const phpBackendBaseUrl = process.env.PHP_BACKEND_BASE_URL || '';
  const paymentsCallbackToken = process.env.PAYMENTS_CALLBACK_TOKEN || '';

  if (!phpBackendBaseUrl) {
    throw new Error('PHP_BACKEND_BASE_URL environment variable is required');
  }

  if (!paymentsCallbackToken) {
    throw new Error('PAYMENTS_CALLBACK_TOKEN environment variable is required');
  }

  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '3306', 10);
  const dbDatabase = process.env.DB_DATABASE || '';
  const dbUsername = process.env.DB_USERNAME || '';
  const dbPassword = process.env.DB_PASSWORD || '';

  if (!dbDatabase || !dbUsername || !dbPassword) {
    throw new Error('Database configuration (DB_DATABASE, DB_USERNAME, DB_PASSWORD) is required');
  }

  const ethRpcUrl = process.env.ETH_RPC_URL || '';
  const bscRpcUrl = process.env.BSC_RPC_URL || '';
  const tronRpcUrl = process.env.TRON_RPC_URL || '';

  const usdtErc20Contract = process.env.USDT_ERC20_CONTRACT || '';
  const usdtBep20Contract = process.env.USDT_BEP20_CONTRACT || '';
  const usdtTrc20Contract = process.env.USDT_TRC20_CONTRACT || '';

  const depositEthMnemonic = process.env.DEPOSIT_ETH_MNEMONIC || '';
  const depositBscMnemonic = process.env.DEPOSIT_BSC_MNEMONIC || '';
  const depositTronMnemonic = process.env.DEPOSIT_TRON_MNEMONIC || '';

  return {
    port,
    phpBackendBaseUrl,
    paymentsCallbackToken,
    db: {
      host: dbHost,
      port: dbPort,
      database: dbDatabase,
      username: dbUsername,
      password: dbPassword,
    },
    rpc: {
      eth: ethRpcUrl,
      bsc: bscRpcUrl,
      tron: tronRpcUrl,
    },
    usdtContracts: {
      erc20: usdtErc20Contract,
      bep20: usdtBep20Contract,
      trc20: usdtTrc20Contract,
    },
    depositMnemonics: {
      eth: depositEthMnemonic,
      bsc: depositBscMnemonic,
      tron: depositTronMnemonic,
    },
  };
}

