import co from 'co';

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
  const users = yield db.Users.find({}, { sort: [['joined', 'asc']] }).toArray();
  for (const user of users) {
    if (user.joined === '0') {
      const file = yield db.Files.findOne({
        owner: user._id,
      }, {
        limit: 1,
        sort: [['time_added', 'asc']],
      });
      if (file && file.time_added > 0) {
        user.createdAt = new Date(file.time_added * 1000).getTime();
      } else {
        user.createdAt = new Date().getTime();
      }
    } else {
      user.createdAt = new Date(user.joined * 1000).getTime();
    }
  }

  users.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

  for (const user of users) {
    if (!user.email) {
      continue;
    }

    const exists = yield models.user.findOne({
      where: {
        email: user.email,
      },
    });

    if (exists) {
      debug('User exists, continue');
      continue;
    }

    const mongoId = user._id.toString();

    const newUser = yield models.user.create({
      email: user.email,
      password: user.salted_password,
      name: user.first_name ? `${user.first_name} ${user.last_name}` : null,
      plan: user.type || 'Free',
      activated: !user.activationCode,
      banned: !!user.banned,
      deletedAt: user.status === 'deleted' ? new Date().getTime() : null,
      createdAt: user.createdAt,
      updatedAt: user.createdAt,
      mongoId,
    }, {
      include: [models.activation],
    });
    yield newUser.save({ silent: true });
  }
  models.sequelize.close();
  db.close();
}).catch((err) => {
  models.sequelize.close();
  db.close();
  debug(err);
});
