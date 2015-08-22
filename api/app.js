import koa from 'koa';
import route from 'koa-route';
import stats from 'koa-statsd';
import websockify from 'koa-websocket';
import logger from 'koa-logger';
import compress from 'koa-compress';
import bodyparser from 'koa-bodyparser';
import cors from 'kcors';
import co from 'co';
import raven from 'raven';
import auth from './lib/auth';
import mongo from '../lib/mongo';
import redis from '../lib/redis';
import * as user from './routes/user';
import * as file from './routes/file';
import debugname from 'debug';
const debug = debugname('hostr-api');
import StatsD from 'statsy';

if (process.env.SENTRY_DSN) {
  const ravenClient = new raven.Client(process.env.SENTRY_DSN);
  ravenClient.patchGlobal();
}

const app = websockify(koa());

app.use(function* (next){
  this.set('Server', 'Nintendo 64');
  if(this.req.headers['x-forwarded-proto'] === 'http'){
    return this.redirect('https://' + this.req.headers.host + this.req.url);
  }
  yield next;
});

let statsdOpts = {prefix: 'hostr-api', host: process.env.STATSD_HOST || 'localhost'};
let statsd = new StatsD(statsdOpts);
app.use(function*(next) {
  this.statsd = statsd;
  yield next;
});
app.use(stats(statsdOpts));

app.use(logger());

app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(mongo());
app.use(redis());
app.ws.use(mongo());
app.ws.use(redis());

app.use(route.get('/', function* (){
  this.status = 200;
  this.body = '';
}));

app.use(function* (next){
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

app.use(compress());
app.use(bodyparser());

app.ws.use(route.all('/file/:id', file.events));
app.ws.use(route.all('/user', user.events));

app.use(route.get('/file/:id', file.get));

// Run auth middleware before all other endpoints
app.use(auth);

app.use(route.get('/user', user.get));
app.use(route.get('/user/token', user.token));
app.use(route.get('/token', user.token));
app.use(route.get('/user/transaction', user.transaction));
app.use(route.post('/user/settings', user.settings));
app.use(route.get('/file', file.list));
app.use(route.post('/file', file.post));
app.use(route.put('/file/:id', file.put));
app.use(route.delete('/file/:id', file.del));

if (!module.parent) {
  app.listen(process.env.PORT || 4042, function() {
    debug('Koa HTTP server listening on port ' + (process.env.PORT || 4042));
  });
  setInterval(function() {
    debug('%sMB', process.memoryUsage().rss / 1024 / 1024);
  }, 10000);
}

export default app;
