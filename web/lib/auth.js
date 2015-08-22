import crypto from 'crypto';
import passwords from 'passwords';
import uuid from 'node-uuid';
import views from 'co-views';
const render = views(__dirname + '/../views', { default: 'ejs'});
import debugname from 'debug';
const debug = debugname('hostr-web:auth');
import { Mandrill } from 'mandrill-api/mandrill';
const mandrill = new Mandrill(process.env.MANDRILL_KEY);
import mongo from '../../lib/mongo';

export function* authenticate(email, password) {
  const Users = this.db.Users;
  const Logins = this.db.Logins;
  const remoteIp = this.headers['x-real-ip'] || this.ip;

  if (!password || password.length < 6){
    debug('No password, or password too short');
    return new Error('Invalid login details');
  }
  const count = yield Logins.count({ip: remoteIp, successful: false, at: { '$gt': Math.ceil(Date.now() / 1000) - 600}});
  if (count > 25) {
    debug('Throttling brute force');
    return new Error('Invalid login details');
  }
  const login = {ip: remoteIp, at: Math.ceil(Date.now() / 1000), successful: null};
  yield Logins.save(login);
  const user = yield Users.findOne({email: email.toLowerCase(), banned: {'$exists': false}, status: {'$ne': 'deleted'}});
  if (user) {
    const verified = yield passwords.verify(password, user.salted_password);
    if (verified) {
      debug('Password verified');
      login.successful = true;
      yield Logins.updateOne({_id: login._id}, login);
      return user;
    } else {
      debug('Password invalid');
      login.successful = false;
      yield Logins.updateOne({_id: login._id}, login);
    }
  } else {
    debug('Email invalid');
    login.successful = false;
    yield Logins.updateOne({_id: login._id}, login);
  }
}


export function* setupSession(user) {
  debug('Setting up session');
  const token = uuid.v4();
  yield this.redis.set(token, user._id, 'EX', 604800);

  const sessionUser = {
    'id': user._id,
    'email': user.email,
    'dailyUploadAllowance': 15,
    'maxFileSize': 20971520,
    'joined': user.joined,
    'plan': user.type || 'Free',
    'uploadsToday': yield this.db.Files.count({owner: user._id, 'time_added': {'$gt': Math.ceil(Date.now()/1000)-86400}}),
    'token': token,
    'md5': crypto.createHash('md5').update(user.email).digest('hex')
  };

  if (sessionUser.plan === 'Pro') {
    sessionUser.maxFileSize = 524288000;
    sessionUser.dailyUploadAllowance = 'unlimited';
  }

  this.session.user = sessionUser;
  if (this.request.body.remember && this.request.body.remember === 'on') {
    const Remember = this.db.Remember;
    var rememberToken = uuid();
    Remember.save({_id: rememberToken, 'user_id': user.id, created: new Date().getTime()});
    this.cookies.set('r', rememberToken, { maxAge: 1209600000, httpOnly: true});
  }
  debug('Session set up');
}


export function* signup(email, password, ip) {
  const Users = this.db.Users;
  const existingUser = yield Users.findOne({email: email, status: {'$ne': 'deleted'}});
  if (existingUser) {
    debug('Email already in use.');
    return 'Email already in use.';
  }
  const cryptedPassword = yield passwords.crypt(password);
  var user = {
    email: email,
    'salted_password': cryptedPassword,
    joined: Math.round(new Date().getTime() / 1000),
    'signup_ip': ip,
    activationCode: uuid()
  };
  Users.insertOne(user);

  const html = yield render('email/inlined/activate', {activationUrl: process.env.BASE_URL + '/activate/' + user.activationCode});
  const text = `Thanks for signing up to Hostr!
Please confirm your email address by clicking the link below.

${process.env.BASE_URL + '/activate/' + user.activationCode}

— Jonathan Cremin, Hostr Founder
`;
  mandrill.messages.send({message: {
    html: html,
    text: text,
    subject: 'Welcome to Hostr',
    'from_email': 'jonathan@hostr.co',
    'from_name': 'Jonathan from Hostr',
    to: [{
      email: user.email,
      type: 'to'
    }],
    'tags': [
      'user-activation'
    ]
  }});
}


export function* sendResetToken(email) {
  const Users = this.db.Users;
  const Reset = this.db.Reset;
  const user = yield Users.findOne({email: email});
  if (user) {
    var token = uuid.v4();
    Reset.save({
      '_id': user._id,
      'token': token,
      'created': Math.round(new Date().getTime() / 1000)
    });
    const html = yield render('email/inlined/forgot', {forgotUrl: process.env.BASE_URL + '/forgot/' + token});
    const text = `It seems you've forgotten your password :(
Visit  ${process.env.BASE_URL + '/forgot/' + token} to set a new one.
`;
    mandrill.messages.send({message: {
      html: html,
      text: text,
      subject: 'Hostr Password Reset',
      'from_email': 'jonathan@hostr.co',
      'from_name': 'Jonathan from Hostr',
      to: [{
        email: user.email,
        type: 'to'
      }],
      'tags': [
        'password-reset'
      ]
    }});
  } else {
    return 'There was an error looking up your email address.';
  }
}


export function* fromToken(token) {
  const Users = this.db.Users;
  const reply = yield this.redis.get(token);
  return yield Users.findOne({_id: reply});
}


export function* fromCookie(cookie) {
  const Remember = this.db.Remember;
  const Users = this.db.Users;
  const remember = yield Remember.findOne({_id: cookie});
  return yield Users.findOne({_id: remember.user_id});
}


export function* validateResetToken() {
  const Reset = this.db.Reset;
  return yield Reset.findOne({token: this.params.id});
}


export function* updatePassword(userId, password) {
  const Users = this.db.Users;
  const cryptedPassword = yield passwords.crypt(password);
  yield Users.update({_id: userId}, {'$set': {'salted_password': cryptedPassword}});
}


export function* activateUser(code) {
  const Users = this.db.Users;
  const user = yield Users.findOne({activationCode: code});
  if (user) {
    Users.updateOne({_id: user._id}, {'$unset': {activationCode: ''}});
    yield setupSession(this, user);
  } else {
    return false;
  }
}
