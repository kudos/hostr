import crypto from 'crypto';
import { join } from 'path';
import passwords from 'passwords';
import uuid from 'node-uuid';
import views from 'co-views';
import models from '../../models';
const render = views(join(__dirname, '..', 'views'), { default: 'ejs' });
import debugname from 'debug';
const debug = debugname('hostr-web:auth');
import sendgridInit from 'sendgrid';
const sendgrid = sendgridInit(process.env.SENDGRID_KEY);

const from = process.env.EMAIL_FROM;
const fromname = process.env.EMAIL_NAME;

export function* authenticate(email, password) {
  const remoteIp = this.headers['x-real-ip'] || this.ip;

  if (!password || password.length < 6) {
    debug('No password, or password too short');
    return new Error('Invalid login details');
  }
  const count = yield models.login.count({
    where: {
      ip: remoteIp,
      successful: false,
      createdAt: {
        $gt: Math.ceil(Date.now() / 1000) - 600,
      },
    },
  });

  if (count > 25) {
    debug('Throttling brute force');
    return new Error('Invalid login details');
  }
  const user = yield models.user.findOne({
    email: email.toLowerCase(),
    activated: 'true',
  });
  const login = yield models.login.create({
    ip: remoteIp,
    successful: false,
  });

  if (user) {
    if (yield passwords.verify(password, user.password)) {
      debug('Password verified');
      login.successful = true;
      yield login.save();
      return user;
    }
    debug('Password invalid');
    login.userId = user.id;
  }
  yield login.save();
  return new Error('Invalid login details');
}


export function* setupSession(user) {
  debug('Setting up session');
  const token = uuid.v4();
  yield this.redis.set(token, user.id, 'EX', 604800);

  const sessionUser = {
    id: user.id,
    email: user.email,
    dailyUploadAllowance: 15,
    maxFileSize: 20971520,
    joined: user.createdAt,
    plan: user.plan,
    uploadsToday: yield models.file.count({ userId: user.id }),
    md5: crypto.createHash('md5').update(user.email).digest('hex'),
    token,
  };

  if (sessionUser.plan === 'Pro') {
    sessionUser.maxFileSize = 524288000;
    sessionUser.dailyUploadAllowance = 'unlimited';
  }

  this.session.user = sessionUser;
  if (this.request.body.remember && this.request.body.remember === 'on') {
    const remember = yield models.remember.create({
      id: uuid(),
      userId: user.id,
    });
    this.cookies.set('r', remember.id, { maxAge: 1209600000, httpOnly: true });
  }
  debug('Session set up');
}


export function* signup(email, password, ip) {
  const existingUser = yield models.user.findOne({ where: { email, activated: true } });
  if (existingUser) {
    debug('Email already in use.');
    throw new Error('Email already in use.');
  }
  const cryptedPassword = yield passwords.crypt(password);
  const user = yield models.user.create({
    email,
    password: cryptedPassword,
    created: Math.round(new Date().getTime() / 1000),
    ip,
    activation: {
      id: uuid(),
      email,
    },
  }, {
    include: [models.activation],
  });

  yield user.save();

  const html = yield render('email/inlined/activate', {
    activationUrl: `${process.env.WEB_BASE_URL}/activate/${user.activation.id}`,
  });
  const text = `Thanks for signing up to Hostr!
Please confirm your email address by clicking the link below.

${process.env.WEB_BASE_URL}/activate/${user.activation.id}

— Jonathan Cremin, Hostr Founder
`;
  const mail = new sendgrid.Email({
    to: user.email,
    subject: 'Welcome to Hostr',
    from,
    fromname,
    html,
    text,
  });
  mail.addCategory('activate');
  sendgrid.send(mail);
}


export function* sendResetToken(email) {
  const user = yield models.user.findOne({ email });
  if (user) {
    const reset = yield models.reset.create({
      id: uuid.v4(),
      userId: user.id,
    });
    const html = yield render('email/inlined/forgot', {
      forgotUrl: `${process.env.WEB_BASE_URL}/forgot/${reset.id}`,
    });
    const text = `It seems you've forgotten your password :(
Visit  ${process.env.WEB_BASE_URL}/forgot/${reset.id} to set a new one.
`;
    const mail = new sendgrid.Email({
      to: user.email,
      from: 'jonathan@hostr.co',
      fromname: 'Jonathan from Hostr',
      subject: 'Hostr Password Reset',
      html,
      text,
    });
    mail.addCategory('password-reset');
    sendgrid.send(mail);
  } else {
    throw new Error('There was an error looking up your email address.');
  }
}


export function* fromToken(token) {
  const userId = yield this.redis.get(token);
  return yield models.user.findbyId(userId);
}


export function* fromCookie(rememberId) {
  const userId = yield models.remember.findById(rememberId);
  return yield models.user.findbyId(userId);
}


export function* validateResetToken(resetId) {
  return yield models.reset.findbyId(resetId);
}


export function* updatePassword(userId, password) {
  const cryptedPassword = yield passwords.crypt(password);
  const user = yield models.user.findById(userId);
  user.password = cryptedPassword;
  yield user.save();
}


export function* activateUser(code) {
  debug(code);
  const activation = yield models.activation.findOne({
    where: {
      id: code,
    },
  });
  if (activation.updatedAt.getTime() === activation.createdAt.getTime()) {
    activation.activated = true;
    yield activation.save();
    const user = yield activation.getUser();
    user.activated = true;
    yield user.save();
    yield setupSession.call(this, user);
    return true;
  }
  return false;
}
