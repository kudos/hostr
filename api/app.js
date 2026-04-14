import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import debugname from 'debug';
import auth from './lib/auth.js';
import * as user from './routes/user.js';
import * as file from './routes/file.js';

const debug = debugname('hostr-api');

const api = new Hono();

api.use(cors({ origin: '*', credentials: true }));

api.onError((err, c) => {
  if (err instanceof HTTPException) {
    const { status } = err;
    if (status === 401) {
      c.header('WWW-Authenticate', 'Basic');
    }
    if (status === 404) {
      return c.json({ error: { message: 'File not found', code: 604 } }, 404);
    }
    return new Response(err.message, {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  debug(err);
  return c.json({ error: { message: 'Internal Server Error' } }, 500);
});

api.delete('/file/:id', auth, file.del);
api.get('/user', auth, user.get);
api.get('/user/token', auth, user.token);
api.get('/token', auth, user.token);
api.post('/user/settings', auth, user.settings);
api.post('/user/delete', auth, user.deleteUser);
api.get('/file', auth, file.list);
api.post('/file', auth, file.post);
api.get('/file/:id', file.get);

api.all('*', () => {
  throw new HTTPException(404, { message: '{"error":{"message":"Not found","code":604}}' });
});

export default api;
