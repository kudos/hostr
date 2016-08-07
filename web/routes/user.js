import {
  authenticate, setupSession, signup as signupUser, activateUser, sendResetToken,
  validateResetToken, updatePassword,
} from '../lib/auth';
import models from '../../models';
import debugname from 'debug';
const debug = debugname('hostr-web:user');

export function* signin() {
  if (!this.request.body.email) {
    yield this.render('signin', { csrf: this.csrf });
    return;
  }

  this.statsd.incr('auth.attempt', 1);
  this.assertCSRF(this.request.body);
  const user = yield authenticate.call(this, this.request.body.email, this.request.body.password);

  if (!user) {
    this.statsd.incr('auth.failure', 1);
    yield this.render('signin', { error: 'Invalid login details', csrf: this.csrf });
    return;
  } else if (user.activationCode) {
    yield this.render('signin', {
      error: 'Your account hasn\'t been activated yet. Check for an activation email.',
      csrf: this.csrf,
    });
    return;
  }
  this.statsd.incr('auth.success', 1);
  yield setupSession.call(this, user);
  this.redirect('/');
}


export function* signup() {
  if (!this.request.body.email) {
    yield this.render('signup', { csrf: this.csrf });
    return;
  }

  this.assertCSRF(this.request.body);
  if (this.request.body.email !== this.request.body.confirm_email) {
    yield this.render('signup', { error: 'Emails do not match.', csrf: this.csrf });
    return;
  } else if (this.request.body.email && !this.request.body.terms) {
    yield this.render('signup', { error: 'You must agree to the terms of service.',
      csrf: this.csrf });
    return;
  } else if (this.request.body.password && this.request.body.password.length < 7) {
    yield this.render('signup', { error: 'Password must be at least 7 characters long.',
      csrf: this.csrf });
    return;
  }
  const ip = this.headers['x-forwarded-for'] || this.ip;
  const email = this.request.body.email;
  const password = this.request.body.password;
  try {
    yield signupUser.call(this, email, password, ip);
  } catch (e) {
    yield this.render('signup', { error: e.message, csrf: this.csrf });
    return;
  }
  this.statsd.incr('auth.signup', 1);
  yield this.render('signup', {
    message: 'Thanks for signing up, we\'ve sent you an email to activate your account.',
    csrf: '',
  });
  return;
}


export function* forgot() {
  const token = this.params.token;

  if (this.request.body.password) {
    if (this.request.body.password.length < 7) {
      yield this.render('forgot', {
        error: 'Password needs to be at least 7 characters long.',
        csrf: this.csrf,
        token,
      });
      return;
    }
    this.assertCSRF(this.request.body);
    const user = yield validateResetToken(token);
    if (user) {
      yield updatePassword(user.userId, this.request.body.password);
      const reset = yield models.reset.findById(token);
      //reset.destroy();
      yield setupSession.call(this, user);
      this.statsd.incr('auth.reset.success', 1);
      this.redirect('/');
    }
  } else if (token) {
    const tokenUser = yield validateResetToken(token);
    if (!tokenUser) {
      this.statsd.incr('auth.reset.fail', 1);
      yield this.render('forgot', {
        error: 'Invalid password reset token. It might be expired, or has already been used.',
        csrf: this.csrf,
        token: null,
      });
      return;
    }
    yield this.render('forgot', { csrf: this.csrf, token });
    return;
  } else if (this.request.body.email) {
    this.assertCSRF(this.request.body);
    try {
      const email = this.request.body.email;
      yield sendResetToken.call(this, email);
      this.statsd.incr('auth.reset.request', 1);
      yield this.render('forgot', {
        message: `We've sent an email with a link to reset your password.
        Be sure to check your spam folder if you it doesn't appear within a few minutes`,
        csrf: this.csrf,
        token: null,
      });
      return;
    } catch (error) {
      debug(error);
    }
  } else {
    yield this.render('forgot', { csrf: this.csrf, token: null });
  }
}


export function* logout() {
  this.statsd.incr('auth.logout', 1);
  this.cookies.set('r', { expires: new Date(1), path: '/' });
  this.session = null;
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
