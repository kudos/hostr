import uuid from 'node-uuid';
import auth from '../lib/auth';

export function* main() {
  if (this.session.user) {
    if (this.query['app-token']) {
      return this.redirect('/');
    }
    const token = uuid.v4();
    yield this.redis.set(token, this.session.user.id, 'EX', 604800);
    this.session.user.token = token;
    yield this.render('index', {user: this.session.user});
  } else {
    if (this.query['app-token']) {
      const user = yield auth.fromToken(this, this.query['app-token']);
      yield auth.setupSession(this, user);
      this.redirect('/');
    } else if (this.cookies.r) {
      const user = yield auth.fromCookie(this, this.cookies.r);
      yield auth.setupSession(this, user);
      this.redirect('/');
    } else {
      yield this.render('marketing');
    }
  }
}

export function* staticPage(next) {
  if (this.session.user) {
    const token = uuid.v4();
    yield this.redis.set(token, this.session.user.id, 'EX', 604800);
    this.session.user.token = token;
    yield this.render('index', {user: this.session.user});
  } else {
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
}
