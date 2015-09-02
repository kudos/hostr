import React from 'react';
import createHandler from './react-route-handler';

import debuglog from 'debug';
const debug = debuglog('hostr:react-handler');

export default function(routes) {
  return function* reactMiddleware(next) {
    debug('asking react');
    this.set('Server', 'Nintendo 64');
    try {
      yield next;
    } catch (err) {
      debug('caught error');
      if (err.status === 404) {
        debug('it\s a 404');
        const Handler = yield createHandler(routes, this.request.url);

        const App = React.createFactory(Handler);
        const content = React.renderToString(new App());
        this.status = 404;
        this.body = '<!doctype html>\n' + content;
      } else {
        debug('Error: %o', err);
        throw err;
      }
    }

    if (this.status !== 404) {
      debug('no error, not 404');
      return;
    }
    debug('react handling');
    switch (this.accepts('html', 'json')) {
    case 'html':
      this.type = 'html';
      const Handler = yield createHandler(routes, this.request.url);

      const App = React.createFactory(Handler);
      const content = React.renderToString(new App());
      this.body = '<!doctype html>\n' + content;
      break;
    case 'json':
      this.body = {message: 'Page Not Found'};
      break;
    default:
      this.type = 'text';
      this.body = 'Page Not Found';
    }
  };
}
