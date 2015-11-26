import redis from 'redis';
import hostrId from '../../lib/hostr-id';
import { post as uploadFile } from './file';
import { formatFile } from '../../lib/format';

const redisUrl = process.env.REDIS_URL;

export function* get() {
  const stack = yield this.rethink
    .table('stacks')
    .get(this.params.id);
  this.assert(stack.userId === this.state.user, 404);

  const files = yield this.rethink
    .table('files')
    .getAll(this.params.id, {index: 'stackId'})
    .filter(this.rethink.row('deleted').eq(null), {default: true});

  stack.files = files.map(formatFile);

  this.body = stack;
}

export function* list(id) {
  const stack = yield this.rethink
    .table('stacks')
    .get(id);
  this.assert(stack.userId === this.state.user, 404);

  const files = yield this.rethink
    .table('files')
    .getAll(id, {index: 'stackId'});

  stack.files = files.map(formatFile);

  this.body = stack;
}

export function* post() {
  const stack = {
    id: yield hostrId.call(this),
    userId: this.state.user,
    created: new Date(),
    updated: null,
    deleted: false,
    views: 0,
  };

  yield this.rethink
    .table('stacks')
    .insert(stack);

  stack.files = [];

  this.body = stack;
}

export function* postFile() {
  return yield uploadFile.call(this);
}

export function* events() {
  const pubsub = redis.createClient(redisUrl);
  pubsub.on('ready', () => {
    pubsub.subscribe(this.path);
  });

  pubsub.on('message', (channel, message) => {
    this.websocket.send(message);
  });
  this.websocket.on('close', () => {
    pubsub.quit();
  });
}
