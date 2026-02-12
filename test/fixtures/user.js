import passwords from 'passwords';

import models from '../../models/index.js';

import debugname from 'debug';
const debug = debugname('hostr:db');

async function createUser() {
  const password = await passwords.hash('test-password');
  const user = await models.user.create({
    'email': 'test@hostr.co',
    'password': password,
    'ip': '127.0.0.1',
    'plan': 'Free',
    'activated': true,
  });
  await user.save();
  await models.sequelize.close();
}

(async () => {
  debug('Syncing schema');
  await models.sequelize.sync();
  debug('Schema synced');
  const user = await models.user.findOne({
    where: {
      email: 'test@hostr.co',
    },
  });
  if (user) {
    await user.destroy();
  }
  debug('Creating test user');
  await createUser();
})();
