/**
 * Main server file for blockchain-service.
 * Sets up Express server, routes, and starts deposit watcher.
 */

import 'dotenv/config';
import express, { Request, Response } from 'express';
import { loadConfig } from './config';
import { initDb, closeDb } from './lib/db';
import { handleDepositAddress } from './routes/depositAddress';
import { startDepositWatcher } from './services/depositWatcher';

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

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'blockchain-service' });
});

// Deposit address generation endpoint
app.post('/api/deposit/address', async (req: Request, res: Response) => {
  await handleDepositAddress(req, res, config);
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

