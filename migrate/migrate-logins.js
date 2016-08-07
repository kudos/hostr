import co from 'co';
import validateIp from 'validate-ip';

import models from '../models';
import { mongo } from '../lib/mongo';

import debugname from 'debug';
const debug = debugname('hostr:db');
let db;


co(function *sync() {
  debug('Syncing schema');
  yield models.sequelize.sync();
  debug('Schema synced');
  db = yield mongo;
  const users = yield models.user.findAll({});
  const userIds = {};
  debug('remap');
  for (const user of users) {
    userIds[user._id] = user.id;
  }
  debug('remap done');
  let logins;
  try {
    logins = db.Logins.find({}, {
      skip: 0,
    });
  } catch (err) {
    debug(err);
  }
  debug('fetched logins');

  while (true) {
    const login = yield logins.next();
    if (!login) {
      break;
    }

    const newLogin = yield models.login.create({
      ip: login.ip,
      createdAt: login.at * 1000,
      successful: login.successful,
    }, { /* logging: false */ });
    newLogin.save();
  }

  models.sequelize.close();
  db.close();
}).catch((err) => {
  models.sequelize.close();
  db.close();
  debug(err);
});
