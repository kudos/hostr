import uuid from 'node-uuid';
import redis from 'redis';
import co from 'co';
import passwords from 'passwords';
import jwt from 'koa-jwt';
import { Mandrill } from 'mandrill-api/mandrill';
const mandrill = new Mandrill(process.env.MANDRILL_KEY);
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
import normalisedUser from '../../lib/normalised-user.js';
import views from 'co-views';
// TODO: Move these templates
const render = views(__dirname + '/../views', { default: 'ejs'});

import debugname from 'debug';
const debug = debugname('hostr-api:user');

const redisUrl = process.env.REDIS_URL;
const fromEmail = process.env.EMAIL_FROM;
const fromName = process.env.EMAIL_NAME;

export function* auth() {
  const email = this.request.body.email || this.request.body.username;
  const password = this.request.body.password;
  this.assert(email && password, 400, '{"error": {"message": "Email and password required.", "code": 606}}');
  const users = yield this.rethink
    .table('users')
    .getAll(email, {index: 'email'})
    .filter(this.rethink.row('status').ne('deleted'), {default: true});
  this.assert(users[0], 400, '{"error": {"message": "Invalid email or password.", "code": 606}}');
  const user = users[0];
  this.assert(yield passwords.match(password, user.password), 400, '{"error": {"message": "Invalid email or password.", "code": 606}}');
  this.body = {token: jwt.sign(user.id, process.env.COOKIE_KEY, {expiresInMinutes: 600})};
}


export function* get() {
  this.body = yield normalisedUser.call(this, this.state.user);
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

  const existingUsers = yield this.rethink
    .table('users')
    .getAll(email, {index: 'email'})
    .filter(this.rethink.row('status').ne('deleted'), {default: true})
    .count();

  this.assert(existingUsers === 0, 400, '{"error": {"message": "An account already exists for this email.", "code": 606}}');

  const cryptedPassword = yield passwords.crypt(password);

  const user = {
    id: yield this.rethink.uuid(),
    email: email,
    password: cryptedPassword,
    created: new Date(),
    ip: ip,
    activated: false,
    type: 'Free',
  };

  const activation = {
    id: yield this.rethink.uuid(),
    userId: user.id,
  };

  yield this.rethink
    .table('activationTokens')
    .insert(activation);

  yield this.rethink
    .table('users')
    .insert(user);

  const html = yield render('email/inlined/activate', {activationUrl: process.env.WEB_BASE_URL + '/activate/' + activation.id});
  const text = `Thanks for signing up to Hostr!
Please confirm your email address by clicking the link below.

${process.env.WEB_BASE_URL + '/activate/' + activation.id}

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
  this.body = yield normalisedUser.call(this, user.id);
}


export function* transaction() {
  const transactions = yield this.rethink
    .table('transactions')
    .getAll(this.state.userid, {'index': 'userId'});

  this.body = transactions.map((transaction) => { // eslint-disable-line no-shadow
    const type = transaction.paypal ? 'paypal' : 'stripe';
    return {
      id: transaction.id,
      amount: transaction.paypal ? transaction.amount : transaction.amount / 100,
      date: transaction.date,
      description: transaction.desc,
      type: type,
    };
  });
}


export function* settings() {
  this.assert(this.request.body, 400, '{"error": {"message": "Current Password required to update account.", "code": 612}}');
  this.assert(this.request.body.current_password, 400, '{"error": {"message": "Current Password required to update account.", "code": 612}}');
  const users = yield this.rethink
    .table('users')
    .getAll(this.request.body.email, {index: 'email'})
    .filter(this.rethink.row('status').ne('deleted'), {default: true});
  this.assert(users[0], 400, '{"error": {"message": "Email not valid.", "code": 612}}');
  const user = users[0];
  this.assert(yield passwords.match(this.request.body.current_password, user.password), 400, '{"error": {"message": "Incorrect password", "code": 606}}');
  const data = {};
  if (this.request.body.email && this.request.body.email !== user.email) {
    data.email = this.request.body.email;
    if (!user.activated_email) {
      data.activated_email = user.email; // eslint-disable-line camelcase
    }
  }
  if (this.request.body.new_password) {
    this.assert(this.request.body.new_password.length >= 7, 400, '{"error": {"message": "Password must be 7 or more characters long.", "code": 606}}');
    data.password = yield passwords.hash(this.request.body.new_password); // eslint-disable-line camelcase
  }
  yield this.rethink
    .table('users')
    .get(user.id)
    .update(data);
  this.body = {};
}


export function* reset() {
  this.assert(this.request.body, 400, '{"error": {"message": "Email is required.", "code": 612}}');
  // timeout to limit abuse, hacky
  setTimeout(co.wrap(function* wrapped() {
    const users = yield this.rethink
      .table('users')
      .getAll(this.request.body.email, {index: 'email'})
      .filter(this.rethink.row('status').ne('deleted'), {default: true});
    this.assert(users[0], 400, '{"error": {"message": "Email not valid.", "code": 612}}');
    const user = users[0];
    const token = uuid.v4();
    yield this.rethink
      .table('resetTokens')
      .insert({
        'id': user.id,
        'token': token,
        'created': new Date(),
      });
    const html = yield render('email/inlined/forgot', {forgotUrl: process.env.WEB_BASE_URL + '/forgot/' + token});
    const text = `It seems you've forgotten your password :(
Visit  ${process.env.WEB_BASE_URL + '/forgot/' + token} to set a new one.
`;
    mandrill.messages.send({message: {
      html: html,
      text: text,
      subject: 'Hostr Password Reset',
      'from_email': 'jonathan@hostr.co',
      'from_name': 'Jonathan from Hostr',
      to: [{
        email: user.email,
        type: 'to',
      }],
      'tags': [
        'password-reset',
      ],
    }});
    this.status = 201;
    this.body = '';
  }.bind(this), 1000));
}


export function* upgrade() {
  const stripeToken = this.request.body.stripeToken;

  const createCustomer = {
    card: stripeToken.id,
    plan: 'usd_monthly',
    email: this.session.email,
  };

  const customer = yield stripe.customers.create(createCustomer);

  this.assert(customer.subscription.status === 'active', 400, '{"error": {"message": "Error validating subscription. Please contact support.", "code": 613}}');

  delete customer.subscriptions;

  yield this.rethink
    .table('users')
    .get(this.state.user)
    .update({stripeCustomer: customer, type: 'Pro'});

  const transaction = { // eslint-disable-line no-shadow
    'userId': this.session.user.id,
    amount: customer.subscription.plan.amount,
    desc: customer.subscription.plan.name,
    date: new Date(customer.subscription.plan.created * 1000),
  };

  yield this.rethink
    .table('transactions')
    .insert(transaction);

  this.body = {type: 'Pro'};

  const html = yield render('email/inlined/pro');
  const text = `Hey, thanks for upgrading to Hostr Pro!

  You've signed up for Hostr Pro Monthly at $6/Month.

  — Jonathan Cremin, Hostr Founder
  `;

  mandrill.messages.send({message: {
    html: html,
    text: text,
    subject: 'Hostr Pro',
    'from_email': fromEmail,
    'from_name': fromName,
    to: [{
      email: this.session.user.email,
      type: 'to',
    }],
    'tags': [
      'pro-upgrade',
    ],
  }});
}


export function* downgrade() {
  const user = yield this.rethink
    .table('users')
    .get(this.state.user);

  const confirmation = yield stripe.customers.cancelSubscription(
    user.stripe_customer.id,
    user.stripe_customer.subscription.id,
    { 'at_period_end': true }
  );

  yield this.rethink
    .table('users')
    .get(this.state.user)
    .update({stripeCustomer: {subscription: confirmation}, type: 'Free'});

  this.body = {type: 'Free'};
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
      } catch (err) {
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
      } catch (err) {
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
