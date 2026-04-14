import crypto from 'crypto';
import { join } from 'path';
import passwords from 'passwords';
import { v4 as uuid } from 'uuid';
import ejs from 'ejs';
import debugname from 'debug';
import nodemailer from 'nodemailer';
import { Op } from 'sequelize';
import { setCookie } from 'hono/cookie';
import models from '../../models/index.js';

const viewsDir = join(import.meta.dirname, '..', 'views');
const debug = debugname('hostr-web:auth');

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.fastmail.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: parseInt(process.env.SMTP_PORT || '465', 10) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const from = process.env.EMAIL_FROM;
const fromname = process.env.EMAIL_NAME;

export async function authenticate(c, email, password) {
  const remoteIp = c.req.header('x-forwarded-for')
    || c.env?.incoming?.socket?.remoteAddress
    || '0.0.0.0';

  if (!password || password.length < 6) {
    debug('No password, or password too short');
    return false;
  }
  const count = await models.login.count({
    where: {
      ip: remoteIp.split(',')[0].trim(),
      successful: false,
      createdAt: { [Op.gt]: Math.ceil(Date.now()) - 600000 },
    },
  });
  if (count > 25) {
    debug('Throttling brute force');
    return false;
  }
  const user = await models.user.findOne({
    where: { email: email.toLowerCase(), activated: true },
  });
  const login = await models.login.create({
    ip: remoteIp.split(',')[0].trim(),
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

export async function setupSession(c, user) {
  debug('Setting up session');
  const redis = c.get('redis');
  const session = c.get('session');
  const token = uuid();

  await redis.set(token, user.id, { EX: 604800 });

  const uploadsToday = await models.file.count({ where: { userId: user.id } });

  session.user = {
    id: user.id,
    email: user.email,
    dailyUploadAllowance: 15,
    maxFileSize: 20971520,
    joined: user.createdAt,
    uploadsToday,
    md5: crypto.createHash('md5').update(user.email).digest('hex'),
    token,
  };
  c.set('session', session);

  let body = {};
  try {
    if (c.req.method === 'POST') body = await c.req.parseBody();
  } catch { /* no body */ }

  if (body.remember === 'on') {
    const remember = await models.remember.create({ id: uuid(), userId: user.id });
    setCookie(c, 'r', remember.id, { maxAge: 1209600, httpOnly: true, path: '/' });
  }
  debug('Session set up');
}

export async function signup(email, password, ip) {
  const existingUser = await models.user.findOne({ where: { email, activated: true } });
  if (existingUser) {
    throw new Error('Email already in use.');
  }
  const cryptedPassword = await passwords.crypt(password);
  const user = await models.user.create(
    { email, password: cryptedPassword, ip, activation: { id: uuid(), email } },
    { include: [models.activation] },
  );
  await user.save();

  const html = await ejs.renderFile(join(viewsDir, 'email/inlined/activate.ejs'), {
    activationUrl: `${process.env.WEB_BASE_URL}/activate/${user.activation.id}`,
  });
  const text = `Thanks for signing up to Hostr!\nPlease confirm your email address by clicking the link below.\n\n${process.env.WEB_BASE_URL}/activate/${user.activation.id}\n\n— Jonathan Cremin, Hostr Founder\n`;
  transport.sendMail({
    to: user.email,
    subject: 'Welcome to Hostr',
    from: `${fromname} <${from}>`,
    html,
    text,
  });
}

export async function sendResetToken(email) {
  const user = await models.user.findOne({ where: { email } });
  if (!user) throw new Error('There was an error looking up your email address.');

  const reset = await models.reset.create({ id: uuid(), userId: user.id });
  const html = await ejs.renderFile(join(viewsDir, 'email/inlined/forgot.ejs'), {
    forgotUrl: `${process.env.WEB_BASE_URL}/forgot/${reset.id}`,
  });
  const text = `It seems you've forgotten your password :(\nVisit ${process.env.WEB_BASE_URL}/forgot/${reset.id} to set a new one.\n`;
  transport.sendMail({
    to: user.email,
    from: `${fromname} <${from}>`,
    subject: 'Hostr Password Reset',
    html,
    text,
  });
}

export async function fromToken(c, token) {
  const userId = await c.get('redis').get(token);
  return models.user.findByPk(userId);
}

export async function fromCookie(rememberId) {
  const remember = await models.remember.findByPk(rememberId);
  if (!remember) return null;
  return models.user.findByPk(remember.userId);
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

export async function activateUser(c, code) {
  const activation = await models.activation.findOne({ where: { id: code } });
  if (!activation) return false;
  if (activation.updatedAt.getTime() === activation.createdAt.getTime()) {
    activation.activated = true;
    await activation.save();
    const user = await activation.getUser();
    user.activated = true;
    await user.save();
    await setupSession(c, user);
    return true;
  }
  return false;
}
