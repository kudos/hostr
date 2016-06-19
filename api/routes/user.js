import uuid from 'node-uuid';
import redis from 'redis';
import co from 'co';
import passwords from 'passwords';
import models from '../../models';

import debugname from 'debug';
const debug = debugname('hostr-api:user');

const redisUrl = process.env.REDIS_URL;

export function* get() {
  this.body = this.user;
}

export function* token() {
  const token = uuid.v4(); // eslint-disable-line no-shadow
  yield this.redis.set(token, this.user.id, 'EX', 86400);
  this.body = { token };
}

export function* transaction() {
  const transactions = yield models.transaction.findAll({ userId: this.user.id });

  this.body = transactions.map((item) => {
    return {
      id: item.id,
      amount: item.amount / 100,
      date: item.date,
      description: item.description,
      type: 'direct',
    };
  });
}

export function* settings() {
  this.assert(this.request.body, 400,
    '{"error": {"message": "Current Password required to update account.", "code": 612}}');
  this.assert(this.request.body.current_password, 400,
    '{"error": {"message": "Current Password required to update account.", "code": 612}}');
  const user = yield models.user.findById(this.user.id);
  this.assert(yield passwords.match(this.request.body.current_password, user.password), 400,
    '{"error": {"message": "Incorrect password", "code": 606}}');
  if (this.request.body.email && this.request.body.email !== user.email) {
    user.email = this.request.body.email;
  }
  if (this.request.body.new_password) {
    this.assert(this.request.body.new_password.length >= 7, 400,
      '{"error": {"message": "Password must be 7 or more characters long.", "code": 606}}');
    user.password = yield passwords.hash(this.request.body.new_password);
  }
  yield user.save();
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
      } catch (err) {
        debug('Invalid JSON for socket auth');
        this.websocket.send('Invalid authentication message. Bad JSON?');
        this.raven.captureError(err);
      }
      try {
        const reply = yield this.redis.get(json.authorization);
        if (reply) {
          pubsub.subscribe(`/user/${reply}`);
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
