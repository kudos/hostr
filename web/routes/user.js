import { authenticate, setupSession, signup as signupUser, activateUser, sendResetToken, validateResetToken, updatePassword } from '../lib/auth';

export function* signin() {
  if (!this.request.body.email) {
    return yield this.render('signin', {csrf: this.csrf});
  }

  this.statsd.incr('auth.attempt', 1);
  this.assertCSRF(this.request.body);
  const user = yield authenticate.call(this, this.request.body.email, this.request.body.password);
  if(!user) {
    this.statsd.incr('auth.failure', 1);
    return yield this.render('signin', {error: 'Invalid login details', csrf: this.csrf});
  } else if (user.activationCode) {
    return yield this.render('signin', {error: 'Your account hasn\'t been activated yet. Check your for an activation email.', csrf: this.csrf});
  } else {
    this.statsd.incr('auth.success', 1);
    yield setupSession.call(this, user);
    this.redirect('/');
  }
}


export function* signup() {
  if (!this.request.body.email) {
    return yield this.render('signup', {csrf: this.csrf});
  }

  this.assertCSRF(this.request.body);
  if (this.request.body.email !== this.request.body.confirm_email) {
    return yield this.render('signup', {error: 'Emails do not match.', csrf: this.csrf});
  } else if (this.request.body.email && !this.request.body.terms) {
    return yield this.render('signup', {error: 'You must agree to the terms of service.', csrf: this.csrf});
  } else if (this.request.body.password && this.request.body.password.length < 7) {
    return yield this.render('signup', {error: 'Password must be at least 7 characters long.', csrf: this.csrf});
  }
  const ip = this.headers['x-real-ip'] || this.ip;
  const email = this.request.body.email;
  const password = this.request.body.password;
  try {
    yield signupUser.call(this, email, password, ip);
  } catch (e) {
    return yield this.render('signup', {error: e.message, csrf: this.csrf});
  }
  this.statsd.incr('auth.signup', 1);
  return yield this.render('signup', {message: 'Thanks for signing up, we\'ve sent you an email to activate your account.', csrf: ''});
}


export function* forgot() {
  const Reset = this.db.Reset;
  const Users = this.db.Users;
  if (this.request.body) {
    return yield this.render('forgot', {token: null, csrf: this.csrf});
  }
  const token = this.params.token;

  this.assertCSRF(this.request.body);
  if (this.request.body.email) {
    var email = this.request.body.email;
    yield sendResetToken.call(this, email);
    this.statsd.incr('auth.reset.request', 1);
    return yield this.render('forgot', {message: 'We\'ve sent an email with a link to reset your password. Be sure to check your spam folder if you it doesn\'t appear within a few minutes', token: null, csrf: this.csrf});
  } else if (token && this.request.body.password) {
    if (this.request.body.password.length < 7) {
      return yield this.render('forgot', {error: 'Password needs to be at least 7 characters long.', token: token, csrf: this.csrf});
    }
    const tokenUser = yield validateResetToken.call(this, token);
    var userId = tokenUser._id;
    yield updatePassword.call(this, userId, this.request.body.password);
    yield Reset.remove({_id: userId});
    const user = yield Users.findOne({_id: userId});
    yield setupSession.call(this, user);
    this.statsd.incr('auth.reset.success', 1);
    this.redirect('/');
  } else if (token.length) {
    const tokenUser = yield validateResetToken.call(this, token);
    if (!tokenUser) {
      this.statsd.incr('auth.reset.fail', 1);
      return yield this.render('forgot', {error: 'Invalid password reset token. It might be expired, or has already been used.', token: null, csrf: this.csrf});
    } else {
      return yield this.render('forgot', {token: token, csrf: this.csrf});
    }
  } else {
    return yield this.render('forgot', {token: null, csrf: this.csrf});
  }
}


export function* logout() {
  this.statsd.incr('auth.logout', 1);
  this.cookies.set('r', {expires: new Date(1), path: '/'});
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
