import { logger } from './logs/logger';
import { closeQueues } from './queues';
import { closeRedisConnection } from './utils/redis';
import { startWorkers, stopWorkers } from './workerRuntime';

const workers = startWorkers();

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'stopping cranl workers');
  await stopWorkers(workers);
  await closeQueues();
  await closeRedisConnection();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
