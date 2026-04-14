import { createClient } from 'redis';
import { WebSocketServer } from 'ws';
import debugname from 'debug';
import { client as redis } from './redis.js';

const debug = debugname('hostr:ws');

async function handleUserEvents(ws) {
  let pubsub;
  try {
    pubsub = createClient({ url: process.env.REDIS_URL });
    pubsub.on('error', (err) => debug('Redis pubsub error:', err));
    await pubsub.connect();
  } catch (err) {
    debug('Failed to connect pubsub Redis:', err);
    ws.close();
    return;
  }

  ws.on('message', async (data) => {
    let json;
    try {
      json = JSON.parse(data.toString());
    } catch {
      ws.send('Invalid authentication message. Bad JSON?');
      return;
    }
    try {
      const userId = await redis.get(json.authorization);
      if (userId) {
        await pubsub.subscribe(`/user/${userId}`, (msg) => ws.send(msg));
        ws.send('{"status":"active"}');
        debug('Subscribed to: /user/%s', userId);
      } else {
        ws.send('Invalid authentication token.');
      }
    } catch (err) {
      debug(err);
    }
  });

  ws.on('close', () => {
    debug('Socket closed');
    pubsub.close();
  });
}

export function attachWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    if (req.url === '/api/user') {
      wss.handleUpgrade(req, socket, head, (ws) => handleUserEvents(ws));
    } else {
      socket.destroy();
    }
  });

  debug('WebSocket server attached');
}
