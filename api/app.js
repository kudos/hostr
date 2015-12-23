import Router from 'koa-router';
import stats from 'koa-statsd';
import cors from 'kcors';
import StatsD from 'statsy';
import jwt from 'koa-jwt';
import * as user from './routes/user';
import * as file from './routes/file';
import * as stack from './routes/stack';
import debugname from 'debug';
const debug = debugname('hostr-api');

const router = new Router();

const statsdOpts = {prefix: 'hostr-api', host: process.env.STATSD_HOST};
router.use(stats(statsdOpts));
const statsd = new StatsD(statsdOpts);
router.use(function* statsMiddleware(next) {
  this.statsd = statsd;
  yield next;
});

router.use(cors({
  origin: '*',
  credentials: true,
}));

router.get('/file/:id', file.get);
router.post('/user/token', user.auth);
router.post('/user', user.create);

router.use(function* authMiddleware(next) {
  try {
    yield next;
    if (this.response.status === 404 && !this.response.body) {
      this.throw(404);
    }
  } catch (err) {
    if (err.status === 401) {
      this.statsd.incr('auth.failure', 1);
      this.set('WWW-Authenticate', 'Basic');
      this.status = 401;
      this.body = err.message;
    } else if (err.status === 404) {
      this.status = 404;
      this.body = {
        error: {
          message: 'File not found',
          code: 604,
        },
      };
    } else {
      if (!err.status) {
        debug(err);
        if (this.raven) {
          this.raven.captureError(err);
        }
        throw err;
      } else {
        this.status = err.status;
        this.body = err.message;
      }
    }
  }
  this.type = 'application/json';
});

const jwtMiddleware = jwt({ secret: process.env.COOKIE_KEY});

router.get('/user', jwtMiddleware, user.get);
router.get('/user/transaction', jwtMiddleware, user.transaction);
router.post('/user/settings', jwtMiddleware, user.settings);
router.post('/user/reset', jwtMiddleware, user.reset);
router.post('/user/pro', jwtMiddleware, user.upgrade);
router.delete('/user/pro', jwtMiddleware, user.downgrade);
router.get('/file', jwtMiddleware, file.list);
router.post('/file', jwtMiddleware, file.post);
router.put('/file/:id', jwtMiddleware, file.put);
router.delete('/file/:id', jwtMiddleware, file.del);
router.post('/stack', jwtMiddleware, stack.post);
router.get('/stack', jwtMiddleware, stack.list);
router.get('/stack/:id', jwtMiddleware, stack.get);
router.post('/stack/:id/file', jwtMiddleware, stack.postFile);

export const ws = new Router();

ws.all('/user', user.events);

export default router;
