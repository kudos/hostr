import Router from '../lib/koa-router-monkeypatched';
import views from 'koa-views';
import error from 'koa-error';
import stats from 'koa-statsd';
import StatsD from 'statsy';
import * as index from './routes/index';
import * as file from './routes/file';
import * as pro from './routes/pro';
import * as user from './routes/user';

const router = new Router();

const statsdOpts = {prefix: 'hostr-web', host: process.env.STATSD_HOST};
router.use(stats(statsdOpts));
const statsd = new StatsD(statsdOpts);
router.use(function* statsMiddleware(next) {
  this.statsd = statsd;
  yield next;
});

router.use(error({template: 'web/public/error.html'}));

router.use(views('views', {
  default: 'ejs',
}));

router.get('/', index.main);

router.get('/account', index.main);
router.get('/billing', index.main);
router.get('/pro', index.main);

router.get('/signin', user.signupin);
router.get('/signup', user.signupin);
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
router.get('/download/:id/:name', function* downloadRedirect(id) {
  this.redirect('/' + id);
});

router.get('/updaters/mac', function* macUpdater() {
  this.redirect('/updaters/mac.xml');
});
router.get('/updaters/mac/changelog', function* macChangelog() {
  yield this.render('mac-update-changelog');
});

export default router;
