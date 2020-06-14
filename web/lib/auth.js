import crypto from 'crypto';
import { join } from 'path';
import passwords from 'passwords';
import uuid from 'node-uuid';
import views from 'co-views';
import debugname from 'debug';
import sendgrid from '@sendgrid/mail';
import models from '../../models';

const render = views(join(__dirname, '..', 'views'), { default: 'ejs' });
const debug = debugname('hostr-web:auth');
sendgrid.setApiKey(process.env.SENDGRID_KEY);

const from = process.env.EMAIL_FROM;
const fromname = process.env.EMAIL_NAME;

export async function authenticate(email, password) {
  const remoteIp = this.headers['x-forwarded-for'] || this.ip;

  if (!password || password.length < 6) {
    debug('No password, or password too short');
    return new Error('Invalid login details');
  }
  const count = await models.login.count({
    where: {
      ip: remoteIp.split(',')[0],
      successful: false,
      createdAt: {
        $gt: Math.ceil(Date.now()) - 600000,
      },
    },
  });

  if (count > 25) {
    debug('Throttling brute force');
    return new Error('Invalid login details');
  }
  const user = await models.user.findOne({
    where: {
      email: email.toLowerCase(),
      activated: true,
    },
  });

  const login = await models.login.create({
    ip: remoteIp.split(',')[0],
    successful: false,
  });

  if (user && user.password) {
    login.userId = user.id;
    if (await passwords.verify(password, user.password)) {
      debug('Password verified');
      login.successful = true;
      await login.save();
      return user;
    }
    debug('Password invalid');
  }
  await login.save();
  return false;
}


export async function setupSession(user) {
  debug('Setting up session');
  const token = uuid.v4();
  debug(user)
  await this.redis.set(token, user.id, 'EX', 604800);

  const sessionUser = {
    id: user.id,
    email: user.email,
    dailyUploadAllowance: 15,
    maxFileSize: 20971520,
    joined: user.createdAt,
    plan: user.plan,
    uploadsToday: await models.file.count({ userId: user.id }),
    md5: crypto.createHash('md5').update(user.email).digest('hex'),
    token,
  };

  if (sessionUser.plan === 'Pro') {
    sessionUser.maxFileSize = 524288000;
    sessionUser.dailyUploadAllowance = 'unlimited';
  }

  this.session.user = sessionUser;
  if (this.request.body.remember && this.request.body.remember === 'on') {
    const remember = await models.remember.create({
      id: uuid(),
      userId: user.id,
    });
    this.cookies.set('r', remember.id, { maxAge: 1209600000, httpOnly: true });
  }
  debug('Session set up');
}


export async function signup(email, password, ip) {
  const existingUser = await models.user.findOne({
    where: {
      email,
      activated: true,
    },
  });
  if (existingUser) {
    debug('Email already in use.');
    throw new Error('Email already in use.');
  }
  const cryptedPassword = await passwords.crypt(password);
  const user = await models.user.create({
    email,
    password: cryptedPassword,
    ip,
    plan: 'Free',
    activation: {
      id: uuid(),
      email,
    },
  }, {
    include: [models.activation],
  });

  await user.save();

  const html = await render('email/inlined/activate', {
    activationUrl: `${process.env.WEB_BASE_URL}/activate/${user.activation.id}`,
  });
  const text = `Thanks for signing up to Hostr!
Please confirm your email address by clicking the link below.

${process.env.WEB_BASE_URL}/activate/${user.activation.id}

— Jonathan Cremin, Hostr Founder
`;
  sendgrid.send({
    to: user.email,
    subject: 'Welcome to Hostr',
    from,
    fromname,
    html,
    text,
    categories: [
      'activate',
    ],
  });
}


export async function sendResetToken(email) {
  const user = await models.user.findOne({
    where: {
      email,
    },
  });
  if (user) {
    const reset = await models.reset.create({
      id: uuid.v4(),
      userId: user.id,
    });
    const html = await render('email/inlined/forgot', {
      forgotUrl: `${process.env.WEB_BASE_URL}/forgot/${reset.id}`,
    });
    const text = `It seems you've forgotten your password :(
Visit  ${process.env.WEB_BASE_URL}/forgot/${reset.id} to set a new one.
`;
    sendgrid.send({
      to: user.email,
      from: 'jonathan@hostr.co',
      fromname: 'Jonathan from Hostr',
      subject: 'Hostr Password Reset',
      html,
      text,
      categories: [
        'password-reset',
      ],
    });
  } else {
    throw new Error('There was an error looking up your email address.');
  }
}


export async function fromToken(token) {
  const userId = await this.redis.get(token);
  return models.user.findByPk(userId);
}


export async function fromCookie(rememberId) {
  const userId = await models.remember.findByPk(rememberId);
  return models.user.findByPk(userId);
}


export async function validateResetToken(resetId) {
  return models.reset.findByPk(resetId);
}


export async function updatePassword(userId, password) {
  const cryptedPassword = await passwords.crypt(password);
  const user = await models.user.findByPk(userId);
  user.password = cryptedPassword;
  await user.save();
}


export async function activateUser(code) {
  const activation = await models.activation.findOne({
    where: {
      id: code,
    },
  });
  if (activation.updatedAt.getTime() === activation.createdAt.getTime()) {
    activation.activated = true;
    await activation.save();
    const user = await activation.getUser();
    user.activated = true;
    await user.save();
    await setupSession.call(this, user);
    return true;
  }
  return false;
}
