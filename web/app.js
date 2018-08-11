import path from 'path';
import Router from 'koa-router';
import CSRF from 'koa-csrf';
import views from 'koa-views';
import StatsD from 'statsy';
import errors from 'koa-error';

import stats from '../lib/koa-statsd';
import * as index from './routes/index';
import * as file from './routes/file';
import * as user from './routes/user';

const router = new Router();

router.use(errors({
  engine: 'ejs',
  template: path.join(__dirname, 'public', 'error.html'),
}));

const statsdOpts = { prefix: 'hostr-web', host: process.env.STATSD_HOST };
router.use(stats(statsdOpts));
const statsd = new StatsD(statsdOpts);
router.use(async (ctx, next) => {
  ctx.statsd = statsd;
  await next();
});

router.use(async (ctx, next) => {
  ctx.state = {
    session: ctx.session,
    baseURL: process.env.WEB_BASE_URL,
    apiURL: process.env.API_BASE_URL,
    stripePublic: process.env.STRIPE_PUBLIC_KEY,
  };
  await next();
});

router.use(new CSRF({
  invalidSessionSecretMessage: 'Invalid session secret',
  invalidSessionSecretStatusCode: 403,
  invalidTokenMessage: 'Invalid CSRF token',
  invalidTokenStatusCode: 403,
  excludedMethods: ['GET', 'HEAD', 'OPTIONS'],
  disableQuery: false,
}));

router.use(views(path.join(__dirname, 'views'), {
  extension: 'ejs',
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

router.get('/:id', file.landing);
router.get('/file/:id/:name', file.get);
router.get('/file/:size/:id/:name', file.get);
router.get('/files/:id/:name', file.get);
router.get('/download/:id/:name', async (ctx, id) => {
  ctx.redirect(`/${id}`);
});

router.get('/updaters/mac', async (ctx) => {
  ctx.redirect('/updaters/mac.xml');
});
router.get('/updaters/mac/changelog', async (ctx) => {
  await ctx.render('mac-update-changelog');
});

export default router;
