import jwt from 'koa-jwt';
import { renderPage } from '../lib/react-handler';
import { routes } from '../public/app/src/app';
import debugname from 'debug';
const debug = debugname('hostr-web:user');

export function* signupin() {
  const token = this.cookies.get('token');
  if (token) {
    try {
      if (yield jwt.verify(token, process.env.COOKIE_KEY)) {
        this.redirect('/');
      }
    } catch (err) {
      debug(err);
      this.body = yield renderPage(routes, this.request.url);
    }
  } else {
    this.body = yield renderPage(routes, this.request.url);
  }
}


export function* forgot() {
  this.body = yield renderPage(routes, this.request.url);
}


export function* logout() {
  this.statsd.incr('user.logout', 1);
  this.cookies.set('token', '', {expires: new Date(1), path: '/'});
  this.redirect('/');
}


export function* activate() {
  const token = yield this.rethink
    .table('activationTokens')
    .get(this.params.token);

  this.assert(token && token.userId, 400, 'This activation token is invalid.');

  yield this.rethink
    .table('users')
    .get(token.userId)
    .update({activated: true});

  this.statsd.incr('user.activated', 1);
  this.redirect('/');
}
