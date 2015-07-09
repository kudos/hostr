import koa from 'koa';
import mount from 'koa-mount';
import spdy from 'spdy';
import api from './api/app';
import web from './web/app';
import { init as storageInit } from './lib/storage';

import debugname from 'debug';
const debug = debugname('hostr');

storageInit();

const app = koa();

app.keys = [process.env.KEYS || 'INSECURE'];

app.use(mount('/api', api));
app.use(mount('/', web));

if (!module.parent) {
  if (process.env.LOCALHOST_KEY) {
    spdy.createServer({
      key: process.env.LOCALHOST_KEY,
      cert: process.env.LOCALHOST_CRT
    }, app.callback()).listen(4040, function() {
      debug('Koa SPDY server listening on port ' + (process.env.PORT || 4040));
    });
  } else {
    app.listen(process.env.PORT || 4040, function() {
      debug('Koa HTTP server listening on port ' + (process.env.PORT || 4040));
    });
  }
}

module.exports = app;
