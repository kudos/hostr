import co from 'co';
import passwords from 'passwords';

import models from '../../models';

import debugname from 'debug';
const debug = debugname('hostr:db');

function *createUser() {
  const password = yield passwords.hash('test-password');
  const user = yield models.user.create({
    'email': 'test@hostr.co',
    'password': password,
    'ip': '127.0.0.1',
    'plan': 'Free',
    'activated': true,
  });
  yield user.save();
  yield models.sequelize.close();
}

co(function *sync() {
  debug('Syncing schema');
  yield models.sequelize.sync();
  debug('Schema synced');
  const user = yield models.user.findOne({
    where: {
      email: 'test@hostr.co',
    },
  });
  if (user) {
    yield user.destroy();
  }
  debug('Creating test user');
  yield createUser();
});
