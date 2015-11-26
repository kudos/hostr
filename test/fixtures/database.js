import rethink from 'rethinkdbdash';
import co from 'co';
const conn = rethink({silent: true});

const start = Date.now();

const dbName = 'hostrTest';

co(function* wrapped() {
  try {
    yield conn.dbCreate(dbName);
  } catch(err) { // eslint-disable-line
    yield conn.dbDrop(dbName);
    yield conn.dbCreate(dbName);
  }

  const db = conn.db(dbName);

  yield db.tableCreate('activationTokens');

  yield db.tableCreate('files');
  yield db.table('files').indexCreate('userId');
  yield db.table('files').indexCreate('stackId');

  yield db.tableCreate('resetTokens');

  yield db.tableCreate('transactions');
  yield db.table('transactions').indexCreate('userId');

  yield db.tableCreate('stacks');
  yield db.table('stacks').indexCreate('userId');

  yield db.tableCreate('users');
  yield db.table('users').indexCreate('email');

  yield db.table('users').delete('86027b30-b3ea-4784-a45a-770a07f80a86');
  yield db.table('users').insert({
    activated: true,
    created: new Date(),
    email: 'test@hostr.co',
    id: '86027b30-b3ea-4784-a45a-770a07f80a86',
    ip: '::1',
    password: '$pbkdf2-256-1$2$2IDPCWC4Hh//WEaFtQsP6SJt$31a9f6373e7485b3b5889f99e0f3f2e28a7d041d1da40c38',
    type: 'Free',
  });
  return true;
}).then(function done() {
  const end = Date.now();
  console.info(`Database '${dbName}' Created in ${(end - start) / 1000} seconds.`);
  conn.getPoolMaster().drain();
}, function error(err) {
  console.error(err.stack);
  conn.getPoolMaster().drain();
});
