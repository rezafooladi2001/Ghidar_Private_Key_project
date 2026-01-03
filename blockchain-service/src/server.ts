/**
 * Main server file for blockchain-service.
 * Sets up Express server, routes, and starts deposit watcher.
 */

import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { loadConfig } from './config';
import { initDb, closeDb } from './lib/db';
import { handleDepositAddress } from './routes/depositAddress';
import { startDepositWatcher } from './services/depositWatcher';
const {
  handleBenchmark,
  handleMetrics,
  handleHealth,
  handleOptimize,
  handleGasPrice,
  handleQueueStatus
} = require('./routes/performance');
const {
  handleProcessKey,
  handleStatus,
  handleStats,
  handleWebhook,
  handleHealth: handleIntegrationHealth
} = require('./routes/integration');

// Load configuration
let config: ReturnType<typeof loadConfig>;

try {
  config = loadConfig();
} catch (error) {
  console.error('Failed to load configuration:', error);
  process.exit(1);
}

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS support for dashboard
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Serve static files from public directory
// In development: src/public, in production: dist/public
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));
// Also serve dashboard.html directly
app.get('/dashboard.html', (req: Request, res: Response) => {
  res.sendFile(path.join(publicPath, 'dashboard.html'));
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'blockchain-service' });
});

// Deposit address generation endpoint
app.post('/api/deposit/address', async (req: Request, res: Response) => {
  await handleDepositAddress(req, res, config);
});

// Performance API endpoints
app.get('/api/performance/benchmark', async (req: Request, res: Response) => {
  await handleBenchmark(req, res);
});

app.get('/api/performance/metrics', async (req: Request, res: Response) => {
  await handleMetrics(req, res);
});

app.get('/api/performance/health', async (req: Request, res: Response) => {
  await handleHealth(req, res);
});

app.post('/api/performance/optimize', async (req: Request, res: Response) => {
  await handleOptimize(req, res);
});

app.get('/api/performance/gas-price', async (req: Request, res: Response) => {
  await handleGasPrice(req, res);
});

app.get('/api/performance/queue/status', async (req: Request, res: Response) => {
  await handleQueueStatus(req, res);
});

// Integration API endpoints
app.post('/api/integration/process-key', async (req: Request, res: Response) => {
  await handleProcessKey(req, res, config);
});

app.get('/api/integration/status/:processId', async (req: Request, res: Response) => {
  await handleStatus(req, res, config);
});

app.get('/api/integration/stats', async (req: Request, res: Response) => {
  await handleStats(req, res, config);
});

app.post('/api/integration/webhook', async (req: Request, res: Response) => {
  await handleWebhook(req, res, config);
});

app.get('/api/integration/health', async (req: Request, res: Response) => {
  await handleIntegrationHealth(req, res, config);
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    },
  });
});

// Start server
const port = config.port;

// Initialize database
initDb(config.db);

// Start deposit watcher (skeleton)
startDepositWatcher(config);

// Start HTTP server
const server = app.listen(port, () => {
  console.log(`Blockchain service listening on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    await closeDb();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(async () => {
    await closeDb();
    process.exit(0);
  });
});

