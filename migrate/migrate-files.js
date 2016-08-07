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
    userIds[user.mongoId] = user.id;
  }
  debug('remap done');
  let files;
  try {
    files = db.Files.find({}, {
      sort: [['time_added', 'desc']],
      skip: 0,
    });
  } catch (err) {
    debug(err);
  }
  debug('fetched files');

  while (true) {
    const file = yield files.next();
    if (!file) {
      break;
    }
    if (!file.time_added || !file.file_size) {
      continue;
    }
    let ip = file.ip ? file.ip.split(',').pop().trim() : null;

    if (typeof ip !== 'string' || !validateIp(ip)) {
      ip = null;
    }
    const processed = file.status !== 'uploading';
    const accessedAt = file.last_accessed ? new Date(file.last_accessed * 1000) : null;

    const mongoId = file._id.toString();

    yield models.file.upsert({
      id: file._id.toString(),
      name: file.file_name,
      originalName: file.original_name || file.file_name,
      size: file.file_size,
      downloads: file.downloads,
      deletedAt: file.status === 'deleted' ? new Date() : null,
      createdAt: new Date(file.time_added * 1000),
      updatedAt: new Date(file.time_added * 1000),
      accessedAt,
      processed,
      type: file.type !== 'file' ? file.type : 'other',
      width: Number.isInteger(file.width) ? file.width : null,
      height: Number.isInteger(file.height) ? file.height : null,
      userId: file.owner !== undefined ? userIds[file.owner] : null,
      ip,
      legacyId: file.system_name !== file._id ? file.system_name : null,
      md5: file.md5,
      malwarePositives: file.virustotal && file.virustotal.positives > 0 ?
      file.virustotal.positives : null,
      mongoId,
    }, { /* logging: false */ });
  }

  models.sequelize.close();
  db.close();
}).catch((err) => {
  models.sequelize.close();
  db.close();
  debug(err);
});
