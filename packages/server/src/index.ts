import Fastify from 'fastify';
import { SHARED_VERSION, type Event } from '@c123-live-mini/shared';

const fastify = Fastify({
  logger: true,
});

fastify.get('/', async () => {
  return { status: 'ok', sharedVersion: SHARED_VERSION };
});

fastify.get('/api/events', async () => {
  const events: Event[] = [
    { id: '1', name: 'Sample Event', status: 'draft' },
  ];
  return events;
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT ?? '3000', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Using shared package version: ${SHARED_VERSION}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
