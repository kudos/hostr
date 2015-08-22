import path from 'path';
import koa from 'koa';
import csrf from 'koa-csrf';
import route from 'koa-route';
import views from 'koa-views';
import stats from 'koa-statsd';
import logger from 'koa-logger';
import favicon from 'koa-favicon';
import redisStore from 'koa-redis';
import compress from 'koa-compress';
import bodyparser from 'koa-bodyparser';
import session from 'koa-generic-session';
import staticHandler from 'koa-file-server';
import co from 'co';
import raven from 'raven';
import StatsD from 'statsy';
// waiting for PR to be merged, can remove swig dependency when done
import errors from '../lib/koa-error';
import mongo from '../lib/mongo';
import redis from '../lib/redis';
import * as index from './routes/index';
import * as file from './routes/file';
import * as pro from './routes/pro';
import * as user from './routes/user';

import debugname from 'debug';
const debug = debugname('hostr-web');

if (process.env.SENTRY_DSN) {
  const ravenClient = new raven.Client(process.env.SENTRY_DSN);
  ravenClient.patchGlobal();
}

const redisUrl = process.env.REDIS_URL || process.env.REDISTOGO_URL || 'redis://localhost:6379';

const app = koa();

let statsdOpts = {prefix: 'hostr-web', host: process.env.STATSD_HOST || 'localhost'};
let statsd = new StatsD(statsdOpts);
app.use(function*(next) {
  this.statsd = statsd;
  yield next;
});
app.use(stats(statsdOpts));

app.use(errors({template: path.join(__dirname, 'public', '404.html')}));

app.use(function*(next){
  this.set('Server', 'Nintendo 64');
  if(this.req.headers['x-forwarded-proto'] === 'http'){
    return this.redirect('https://' + this.request.headers.host + this.request.url);
  }
  yield next;
});

app.use(function*(next){
  this.state = {
    apiURL: process.env.API_URL,
    baseURL: process.env.BASE_URL,
    stripePublic: process.env.STRIPE_PUBLIC_KEY
  };
  yield next;
});

app.use(mongo());
app.use(redis());
app.use(compress());
app.use(bodyparser());
app.use(favicon(path.join(__dirname, 'public/images/favicon.png')));
app.use(staticHandler({root: path.join(__dirname, 'public'), maxage: 31536000000}));
app.use(logger());
app.use(views('views', {
  default: 'ejs'
}));

app.keys = [process.env.KEYS || 'INSECURE'];
app.use(session({
  store: redisStore({client: redis().client})
}));

app.use(route.get('/', index.main));
app.use(route.get('/account', index.main));
app.use(route.get('/billing', index.main));
app.use(route.get('/pro', index.main));

app.use(route.get('/signin', user.signin));
app.use(route.post('/signin', user.signin));
app.use(route.get('/signup', user.signup));
app.use(route.post('/signup', user.signup));
app.use(route.get('/logout', user.logout));
app.use(route.post('/logout', user.logout));
app.use(route.get('/forgot', user.forgot));
app.use(route.get('/forgot/:token', user.forgot));
app.use(route.post('/forgot/:token', user.forgot));
app.use(route.post('/forgot', user.forgot));
app.use(route.get('/activate/:code', user.activate));

app.use(route.get('/terms', index.staticPage));
app.use(route.get('/privacy', index.staticPage));
app.use(route.get('/pricing', index.staticPage));
app.use(route.get('/apps', index.staticPage));
app.use(route.get('/stats', index.staticPage));

app.use(route.post('/pro/create', pro.create));
app.use(route.post('/pro/cancel', pro.cancel));

app.use(route.get('/:id', file.landing));
app.use(route.get('/download/:id/:name', function* (id) {
  this.redirect('/' + id);
}));
app.use(route.get('/file/:id/:name', file.get));
app.use(route.get('/files/:id/:name', file.get));
app.use(route.get('/file/:size/:id/:name', file.resized));

app.use(route.get('/updaters/mac', function* () {
  this.redirect('/updaters/mac.xml');
}));
app.use(route.get('/updaters/mac/changelog', function* () {
  yield this.render('mac-update-changelog');
}));

if (!module.parent) {
  app.listen(process.env.PORT || 4041, function() {
    debug('Koa HTTP server listening on port ' + (process.env.PORT || 4041));
  });
  setInterval(function() {
    debug('%sMB', process.memoryUsage().rss / 1024 / 1024);
  }, 10000);
}

export default app;
