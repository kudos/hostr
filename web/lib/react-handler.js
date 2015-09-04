import React from 'react';
import { createStore } from 'redux';
import { Provider } from 'react-redux';
import createHandler from './react-route-handler';
import reducers from '../public/app/src/reducers';
import { formatFile } from '../../lib/format';

import debuglog from 'debug';
const debug = debuglog('hostr:react-handler');

function* renderPage(routes, url, store = createStore(reducers)) {
  const { Handler, routerState } = yield createHandler(routes, url);
  const content = React.renderToString(
    <Provider store={store}>
      {() => <Handler routerState={routerState} />}
    </Provider>
  );
  return '<!doctype html>\n' + content.replace('</body></html>', `<script>window.STATE = ${JSON.stringify(store.getState())}</script></body></html>`);
}

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
        // this.status = 404;
        // this.body = yield renderPage(routes, this.request.url);
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
      const user = this.session.user;
      let files = [];
      if (user) {
        files = yield this.db.Files.find({owner: this.db.objectId(user.id), status: 'active'}).toArray();
      }
      const store = createStore(reducers, {user: user, files: files.map(formatFile), uploads: []});
      this.body = yield renderPage(routes, this.request.url, store);
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
