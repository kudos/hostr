import path from 'path';
import Router from 'koa-router';
import csrf from 'koa-csrf';
import views from 'koa-views';
import stats from 'koa-statsd';
import redis from '../lib/redis';
import koaRedis from 'koa-redis'
import session from 'koa-generic-session';
import co from 'co';
import StatsD from 'statsy';
// waiting for PR to be merged, can remove swig dependency when done
import errors from '../lib/koa-error';
import * as index from './routes/index';
import * as file from './routes/file';
import * as pro from './routes/pro';
import * as user from './routes/user';

import debugname from 'debug';
const debug = debugname('hostr-web');

const router = new Router();
router.use(errors({template: path.join(__dirname, 'public', '404.html')}));

let statsdOpts = {prefix: 'hostr-web', host: process.env.STATSD_HOST || 'localhost'};
let statsd = new StatsD(statsdOpts);
router.use(function* (next) {
  this.statsd = statsd;
  yield next;
});
router.use(stats(statsdOpts));

router.use(session({
  store: koaRedis({client: redis().client})
}));

router.use(function* (next){
  this.state = {
    session: this.session,
    apiURL: process.env.API_URL,
    baseURL: process.env.BASE_URL,
    stripePublic: process.env.STRIPE_PUBLIC_KEY
  };
  yield next;
});

router.use(views('views', {
  default: 'ejs'
}));

router.get('/', index.main);
router.get('/account', index.main);
router.get('/billing', index.main);
router.get('/pro', index.main);

router.get('/signin', user.signin);
router.post('/signin', user.signin);
router.get('/signup', user.signup);
router.post('/signup', user.signup);
router.get('/logout', user.logout);
router.post('/logout', user.logout);
router.get('/forgot', user.forgot);
router.get('/forgot/:token', user.forgot);
router.post('/forgot/:token', user.forgot);
router.post('/forgot', user.forgot);
router.get('/activate/:code', user.activate);

router.get('/terms', index.staticPage);
router.get('/privacy', index.staticPage);
router.get('/pricing', index.staticPage);
router.get('/apps', index.staticPage);
router.get('/stats', index.staticPage);

router.post('/pro/create', pro.create);
router.post('/pro/cancel', pro.cancel);

router.get('/:id', file.landing);
router.get('/file/:id/:name', file.get);
router.get('/file/:size/:id/:name', file.get);
router.get('/files/:id/:name', file.get);
router.get('/download/:id/:name', function* (id) {
  this.redirect('/' + id);
});

router.get('/updaters/mac', function* () {
  this.redirect('/updaters/mac.xml');
});
router.get('/updaters/mac/changelog', function* () {
  yield this.render('mac-update-changelog');
});

export default router;
