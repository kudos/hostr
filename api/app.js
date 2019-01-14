import Router from 'koa-router';
import cors from 'kcors';
import StatsD from 'statsy';
import debugname from 'debug';

import stats from '../lib/koa-statsd';
import auth from './lib/auth';
import * as user from './routes/user';
import * as file from './routes/file';
import * as pro from './routes/pro';

const debug = debugname('hostr-api');

const router = new Router();

const statsdOpts = { prefix: 'hostr-api', host: process.env.STATSD_HOST };
router.use(stats(statsdOpts));
const statsd = new StatsD(statsdOpts);
router.use(async (ctx, next) => {
  ctx.statsd = statsd;
  await next();
});

router.use(cors({
  origin: '*',
  credentials: true,
}));

router.use(async (ctx, next) => {
  try {
    await next();

    if (ctx.response.status === 404 && !ctx.response.body) {
      ctx.throw(404);
    }
  } catch (err) {
    if (err.status === 401) {
      ctx.statsd.incr('auth.failure', 1);
      ctx.set('WWW-Authenticate', 'Basic');
      ctx.status = 401;
      ctx.body = err.message;
    } else if (err.status === 404) {
      ctx.status = 404;
      ctx.body = {
        error: {
          message: 'File not found',
          code: 604,
        },
      };
    } else if (!err.status) {
      debug(err);
      if (ctx.Sentry) {
        ctx.Sentry.captureException(err);
      }
      throw err;
    } else {
      ctx.status = err.status;
      ctx.body = err.message;
    }
  }
  ctx.type = 'application/json';
});

router.delete('/file/:id', auth, file.del);
router.get('/user', auth, user.get);
router.get('/user/token', auth, user.token);
router.get('/token', auth, user.token);
router.get('/user/transaction', auth, user.transaction);
router.post('/user/settings', auth, user.settings);
router.post('/user/pro', auth, pro.create);
router.delete('/user/pro', auth, pro.cancel);
router.get('/file', auth, file.list);
router.post('/file', auth, file.post);
router.get('/file/:id', file.get);


// Hack, if no route matches here, router does not dispatch at all
router.get('/(.*)', async (ctx) => {
  ctx.throw(404);
});

export const ws = new Router();

ws.all('/user', user.events);

export default router;
