import co from 'co';

import models from '../../models';

import debugname from 'debug';
const debug = debugname('hostr:db');

function *createUser() {
  const user = yield models.user.create({
    'email': 'test@hostr.co',
    'password': '$pbkdf2-256-1$2$kBhIDRqFwnF/1ms6ZHfME2o2$a48e8c350d26397fcc88bf0a7a2817b1cdcd1ffffe0521a5',
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
