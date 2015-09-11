import { createStore } from 'redux';
import jwt from 'koa-jwt';

import auth from '../lib/auth';
import { formatFile } from '../../lib/format';
import normalisedUser from '../../lib/normalised-user';
import { renderPage } from '../lib/react-handler';
import { routes } from '../public/app/src/app';
import reducers from '../public/app/src/reducers';

export function* main() {
  const token = this.cookies.get('token');
  if (token) {
    try {
      if (jwt.verify(token, process.env.COOKIE_KEY)) {
        const user = yield normalisedUser.call(this, this.db.objectId(jwt.decode(token)));
        const files = yield this.db.Files.find({owner: this.db.objectId(user.id), status: 'active'}).toArray();
        const store = createStore(reducers, { user, files: files.map(formatFile)});

        this.body = yield renderPage(routes, this.request.url, store);
        return;
      }
    } catch (e) {
      console.error(e);
    }
  }
  if (this.query['app-token']) {
    const user = yield auth.fromToken(this, this.query['app-token']);
    yield auth.setupSession(this, user);
    this.redirect('/');
    return;
  }
  this.body = yield renderPage(routes, this.request.url);
}

export function* staticPage(next) {
  switch (this.originalUrl) {
  case '/terms':
    yield this.render('terms');
    break;
  case '/privacy':
    yield this.render('privacy');
    break;
  case '/pricing':
    yield this.render('pricing');
    break;
  case '/apps':
    yield this.render('apps');
    break;
  case '/stats':
    yield this.render('index', {user: {}});
    break;
  default:
    yield next;
  }
}
