import models from '../models/index.js';

import debugname from 'debug';
const debug = debugname('hostr:db');

(async () => {
  debug('Syncing schema');
  await models.sequelize.sync();
  debug('Schema synced');
  process.exit();
})();
