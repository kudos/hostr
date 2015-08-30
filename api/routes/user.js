import uuid from 'node-uuid';
import redis from 'redis-url';
import co from 'co';
import passwords from 'passwords';

import debugname from 'debug';
const debug = debugname('hostr-api:user');

const redisUrl = process.env.REDIS_URL;

export function* get() {
  this.body = this.user;
}

export function* token() {
  const token = uuid.v4(); // eslint-disable-line no-shadow
  yield this.redis.set(token, this.user.id, 'EX', 86400);
  this.body = {token: token};
}

export function* transaction() {
  const Transactions = this.db.Transactions;
  const transactions = yield Transactions.find({'user_id': this.user.id}).toArray();

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
  this.assert(this.request.body, 400, '{"error": {"message": "Current Password required to update account.", "code": 612}}');
  this.assert(this.request.body.current_password, 400, '{"error": {"message": "Current Password required to update account.", "code": 612}}');
  const Users = this.db.Users;
  const user = yield Users.findOne({'_id': this.user.id});
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
  const pubsub = redis.connect(redisUrl);
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
