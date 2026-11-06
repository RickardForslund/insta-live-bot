import { loadConfig } from './config.js';
import { loadEnvFile } from './env.js';
import { log } from './logger.js';
import { createApp, startServer } from './app.js';

loadEnvFile();

const config = loadConfig();
const server = startServer(createApp({ config }));

function shutdown(signal: string): void {
  log.info(`Received ${signal}, closing server`);
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
