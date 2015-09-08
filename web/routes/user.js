import jwt from 'koa-jwt';
import { setupSession, activateUser, sendResetToken, validateResetToken, updatePassword } from '../lib/auth';
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
    } catch (e) {
      debug(e);
      this.body = yield renderPage(routes, this.request.url);
    }
  } else {
    this.body = yield renderPage(routes, this.request.url);
  }
}


export function* forgot() {
  const Reset = this.db.Reset;
  const Users = this.db.Users;
  const token = this.params.token;

  if (this.request.body.password) {
    if (this.request.body.password.length < 7) {
      return yield this.render('forgot', {error: 'Password needs to be at least 7 characters long.', token: token, csrf: this.csrf});
    }
    this.assertCSRF(this.request.body);
    const tokenUser = yield validateResetToken.call(this, token);
    const userId = tokenUser._id;
    yield updatePassword.call(this, userId, this.request.body.password);
    yield Reset.deleteOne({_id: userId});
    const user = yield Users.findOne({_id: userId});
    yield setupSession.call(this, user);
    this.statsd.incr('auth.reset.success', 1);
    this.redirect('/');
  } else if (token) {
    const tokenUser = yield validateResetToken.call(this, token);
    if (!tokenUser) {
      this.statsd.incr('auth.reset.fail', 1);
      return yield this.render('forgot', {error: 'Invalid password reset token. It might be expired, or has already been used.', token: null, csrf: this.csrf});
    }
    return yield this.render('forgot', {token: token, csrf: this.csrf});
  } else if (this.request.body.email) {
    this.assertCSRF(this.request.body);
    try {
      const email = this.request.body.email;
      yield sendResetToken.call(this, email);
      this.statsd.incr('auth.reset.request', 1);
      return yield this.render('forgot', {message: 'We\'ve sent an email with a link to reset your password. Be sure to check your spam folder if you it doesn\'t appear within a few minutes', token: null, csrf: this.csrf});
    } catch (error) {
      debug(error);
    }
  } else {
    yield this.render('forgot', {token: null, csrf: this.csrf});
  }
}


export function* logout() {
  this.statsd.incr('auth.logout', 1);
  this.cookies.set('token', {expires: new Date(1), path: '/'});
  this.redirect('/');
}


export function* activate() {
  const code = this.params.code;
  if (yield activateUser.call(this, code)) {
    this.statsd.incr('auth.activation', 1);
    this.redirect('/');
  } else {
    this.throw(400);
  }
}
