import { authenticate, setupSession, signup as signupUser, activateUser, sendResetToken, validateResetToken, updatePassword } from '../lib/auth';

export function* signin() {
  if (!this.request.body.email) {
    return yield this.render('signin');
  }

  const user = yield authenticate(this, this.request.body.email, this.request.body.password);
  if(!user) {
    return yield this.render('signin', {error: 'Invalid login details'});
  } else if (user.activationCode) {
    return yield this.render('signin', {error: 'Your account hasn\'t been activated yet. Check your for an activation email.'});
  } else {
    yield setupSession(this, user);
    this.redirect('/');
  }
}


export function* signup() {
  if (!this.request.body.email) {
    return yield this.render('signup');
  }

  if (this.request.body.email !== this.request.body.confirm_email) {
    return yield this.render('signup', {error: 'Emails do not match.'});
  } else if (this.request.body.email && !this.request.body.terms) {
    return yield this.render('signup', {error: 'You must agree to the terms of service.'});
  } else if (this.request.body.password && this.request.body.password.length < 7) {
    return yield this.render('signup', {error: 'Password must be at least 7 characters long.'});
  }
  const ip = this.headers['x-real-ip'] || this.ip;
  const email = this.request.body.email;
  const password = this.request.body.password;
  try {
    yield signupUser(this, email, password, ip);
  } catch (e) {
    return yield this.render('signup', {error: e.message});
  }
  return yield this.render('signup', {message: 'Thanks for signing up, we\'ve sent you an email to activate your account.'});
}


export function* forgot(token) {
  const Reset = this.db.Reset;
  const Users = this.db.Users;
  if (this.request.body.email) {
    var email = this.request.body.email;
    yield sendResetToken(this, email);
    return yield this.render('forgot', {message: 'We\'ve sent an email with a link to reset your password. Be sure to check your spam folder if you it doesn\'t appear within a few minutes', token: null});
  } else if (token && this.request.body.password) {
    if (this.request.body.password.length < 7) {
      return this.render('forgot', {error: 'Password needs to be at least 7 characters long.', token: token});
    }
    const tokenUser = yield validateResetToken(this, token);
    var userId = tokenUser._id;
    yield updatePassword(this, userId, this.request.body.password);
    yield Reset.remove({_id: userId});
    const user = yield Users.findOne({_id: userId});
    yield setupSession(this, user);
    this.redirect('/');
  } else if (token.length) {
    const tokenUser = yield validateResetToken(this, token);
    if (!tokenUser) {
      return yield this.render('forgot', {error: 'Invalid password reset token. It might be expired, or has already been used.', token: null});
    } else {
      return yield this.render('forgot', {token: token});
    }
  } else {
    return yield this.render('forgot', {token: null});
  }
}


export function* logout() {
  this.cookies.set('r', {expires: new Date(1), path: '/'});
  this.session = null;
  this.redirect('/');
}


export function* activate(code) {
  yield activateUser(this, code);
  this.redirect('/');
}
