import Router from 'koa-router';
import stats from 'koa-statsd';
import cors from 'kcors';
import StatsD from 'statsy';
import auth from './lib/auth';
import * as user from './routes/user';
import * as file from './routes/file';
import debugname from 'debug';
const debug = debugname('hostr-api');

const router = new Router();

let statsdOpts = {prefix: 'hostr-api', host: process.env.STATSD_HOST || 'localhost'};
router.use(stats(statsdOpts));
let statsd = new StatsD(statsdOpts);
router.use(function*(next) {
  this.statsd = statsd;
  yield next;
});

router.use(cors({
  origin: '*',
  credentials: true
}));

router.use('/*',function* (next) {
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
    } else if(err.status === 404) {
      this.status = 404;
      this.body = {
        error: {
          message: 'File not found',
          code: 604
        }
      };
    } else {
      if (!err.status) {
        debug(err);
        throw err;
      } else {
        this.status = err.status;
        this.body = err.message;
      }
    }
  }
  this.type = 'application/json';
});

router.get('/user', auth, user.get);
router.get('/user/token', auth, user.token);
router.get('/token', auth, user.token);
router.get('/user/transaction', auth, user.transaction);
router.post('/user/settings', auth, user.settings);
router.get('/file', auth, file.list);
router.post('/file', auth, file.post);
router.get('/file/:id', file.get);
router.put('/file/:id', auth, file.put);
router.delete('/file/:id', auth, file.del);
router.delete('/file/:id', auth, file.del);

// Hack, if no route matches here, router does not dispatch at all
router.get('/(.*)', function* () {
  this.throw(404);
});

export default router;
