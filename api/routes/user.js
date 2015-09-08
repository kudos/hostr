import uuid from 'node-uuid';
import redis from 'redis';
import co from 'co';
import passwords from 'passwords';
import jwt from 'koa-jwt';
import { Mandrill } from 'mandrill-api/mandrill';
const mandrill = new Mandrill(process.env.MANDRILL_KEY);
import normalisedUser from '../../lib/normalised-user.js';
import views from 'co-views';
// TODO: Move these templates
const render = views(__dirname + '/../../web/views', { default: 'ejs'});

import debugname from 'debug';
const debug = debugname('hostr-api:user');

const redisUrl = process.env.REDIS_URL;

export function* auth() {
  const email = this.request.body.email || this.request.body.username;
  const password = this.request.body.password;
  this.assert(email && password, 400, '{"error": {"message": "Email and password required.", "code": 606}}');
  const user = yield this.db.Users.findOne({ email: email});
  this.assert(yield passwords.match(password, user.salted_password), 400, '{"error": {"message": "Invalid email or password.", "code": 606}}');
  this.body = {token: jwt.sign(user._id, process.env.COOKIE_KEY, {expiresInMinutes: 600})};
}

export function* get() {
  this.body = yield normalisedUser.call(this, this.db.objectId(this.state.user));
}

export function* create() {
  this.assert(this.request.body.email, 400, '{"error": {"message": "Email is required.", "code": 606}}');
  // Just check that it has an @ in the middle and a dot somewhere afterwards. Let it bounce if it's invalid after that.
  this.assert(this.request.body.email.match(/(.*)@(.*)\./), 400, '{"error": {"message": "Invalid email.", "code": 606}}');
  this.assert(this.request.body.password, 400, '{"error": {"message": "Password is required.", "code": 606}}');
  this.assert(this.request.body.password, 400, '{"error": {"message": "Password must be at least 7 characters long.", "code": 606}}');
  this.assert(this.request.body.terms, 400, `{"error": {"message": "You must agree to the terms of service.", "code": 606}}`);

  const ip = this.headers['x-real-ip'] || this.ip;
  const email = this.request.body.email;
  const password = this.request.body.password;

  const existingUser = yield this.db.Users.findOne({email: email, status: {'$ne': 'deleted'}});
  this.assert(!existingUser, 400, '{"error": {"message": "An account already exists for this email.", "code": 606}}');

  const cryptedPassword = yield passwords.crypt(password);

  const user = {
    email: email,
    'salted_password': cryptedPassword,
    joined: Math.round(new Date().getTime() / 1000),
    'signup_ip': ip,
    activationCode: uuid(),
    type: 'Free',
  };

  const insert = yield this.db.Users.insertOne(user);

  const html = yield render('email/inlined/activate', {activationUrl: process.env.WEB_BASE_URL + '/activate/' + user.activationCode});
  const text = `Thanks for signing up to Hostr!
Please confirm your email address by clicking the link below.

${process.env.WEB_BASE_URL + '/activate/' + user.activationCode}

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
      type: 'to',
    }],
    'tags': [
      'user-activation',
    ],
  }});
  this.statsd.incr('api.user.create', 1);
  this.body = yield normalisedUser.call(this, insert.insertedId);
}

export function* transaction() {
  this.state.userid = this.db.objectId(this.state.userid);
  const Transactions = this.db.Transactions;
  const transactions = yield Transactions.find({'user_id': this.state.userid}).toArray();

  this.body = transactions.map((transaction) => { // eslint-disable-line no-shadow
    const type = transaction.paypal ? 'paypal' : 'direct';
    return {
      id: transaction._id,
      amount: transaction.paypal ? transaction.amount : transaction.amount / 100,
      date: transaction.date,
      description: transaction.desc,
      type: type,
    };
  });
}

export function* settings() {
  this.state.userid = this.db.objectId(this.state.userid);
  this.assert(this.request.body, 400, '{"error": {"message": "Current Password required to update account.", "code": 612}}');
  this.assert(this.request.body.current_password, 400, '{"error": {"message": "Current Password required to update account.", "code": 612}}');
  const Users = this.db.Users;
  const user = yield Users.findOne({'_id': this.state.userid});
  this.assert(yield passwords.match(this.request.body.current_password, user.salted_password), 400, '{"error": {"message": "Incorrect password", "code": 606}}');
  const data = {};
  if (this.request.body.email && this.request.body.email !== user.email) {
    data.email = this.request.body.email;
    if (!user.activated_email) {
      data.activated_email = user.email; // eslint-disable-line camelcase
    }
  }
  if (this.request.body.new_password) {
    this.assert(this.request.body.new_password.length >= 7, 400, '{"error": {"message": "Password must be 7 or more characters long.", "code": 606}}');
    data.salted_password = yield passwords.hash(this.request.body.new_password); // eslint-disable-line camelcase
  }
  Users.updateOne({_id: user._id}, {'$set': data});
  this.body = {};
}

export function* events() {
  const pubsub = redis.createClient(redisUrl);
  pubsub.on('message', (channel, message) => {
    this.websocket.send(message);
  });
  pubsub.on('ready', () => {
    this.websocket.on('message', co.wrap(function* wsMessage(message) {
      let json;
      try {
        json = JSON.parse(message);
      } catch(err) {
        debug('Invalid JSON for socket auth');
        this.websocket.send('Invalid authentication message. Bad JSON?');
        this.raven.captureError(err);
      }
      try {
        const reply = yield this.redis.get(json.authorization);
        if (reply) {
          pubsub.subscribe('/user/' + reply);
          this.websocket.send('{"status":"active"}');
          debug('Subscribed to: /user/%s', reply);
        } else {
          this.websocket.send('Invalid authentication token.');
        }
      } catch(err) {
        debug(err);
        this.raven.captureError(err);
      }
    }.bind(this)));
  });
  this.websocket.on('close', () => {
    debug('Socket closed');
    pubsub.quit();
  });
}
