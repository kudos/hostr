import { formatFile } from '../../lib/format';
import normalisedUser from '../../lib/normalised-user.js';

import { createStore } from 'redux';

import { routes } from '../public/app/src/app';
import reducers from '../public/app/src/reducers';
import { renderPage } from '../lib/react-handler';


export function* get() {
  const stack = yield this.rethink
    .table('stacks')
    .get(this.params.id);
  this.assert(stack && stack.deleted === false, 404);

  const stackFiles = yield this.rethink
    .table('files')
    .getAll(this.params.id, {index: 'stackId'});

  stack.files = stackFiles.map(formatFile);

  const userId = this.state.user;
  let files = [];
  let user = {};
  if (userId) {
    user = normalisedUser.call(this, user);
    files = yield this.rethink
      .table('files')
      .getAll(this.state.user, {index: 'userId'})
      .filter(this.rethink.row('deleted').eq(null), {default: true});
  }

  const store = createStore(reducers, {stack, user, files: files.map(formatFile)});

  this.body = yield renderPage(routes, this.request.url, store);

  this.statsd.incr('file.landing', 1);
}
