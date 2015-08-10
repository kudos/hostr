import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import hostrFileStream from '../../lib/hostr-file-stream';
import { formatFile } from '../../lib/format';

import debugname from 'debug';
const debug = debugname('hostr-web:file');

const storePath = process.env.STORE_PATH || path.join(process.env.HOME, '.hostr', 'uploads');

const userAgentCheck = function(userAgent) {
  if (!userAgent){
    return false;
  }
  return userAgent.match(/^(wget|curl|vagrant)/i);
};

const hotlinkCheck = function(file, userAgent, referrer) {
  return !userAgentCheck(userAgent) && !file.width && (!referrer || !(referrer.match(/^https:\/\/hostr.co/) || referrer.match(/^http:\/\/localhost:4040/)))
};

export function* get(id, name, size) {
  const file = yield this.db.Files.findOne({_id: id, 'file_name': name, 'status': 'active'});
  this.assert(file, 404);

  if (hotlinkCheck(file, this.headers['user-agent'], this.headers['referer'])) {
    return this.redirect('/' + id);
  }

  if (!file.width && this.request.query.warning != 'on') {
    return this.redirect('/' + id);
  }

  if (file.malware) {
    let alert = this.request.query.alert;
    if (!alert || !alert.match(/i want to download malware/i)) {
      return this.redirect('/' + id);
    }
  }

  let localPath = path.join(storePath, file._id[0], file._id + '_' + file.file_name);
  let remotePath = path.join(file._id[0], file._id + '_' + file.file_name);
  if (size > 0) {
    localPath = path.join(storePath, file._id[0], size, file._id + '_' + file.file_name);
    remotePath = path.join(size, file._id + '_' + file.file_name);
  }

  if (file.malware) {
    this.statsd.incr('file.malware.download', 1);
  }

  let type = 'application/octet-stream';
  if (file.width > 0) {
    if (size) {
      this.statsd.incr('file.view', 1);
    }
    type = mime.lookup(file.file_name);
  } else {
    this.statsd.incr('file.download', 1);
  }

  if (userAgentCheck(this.headers['user-agent'])) {
    this.set('Content-Disposition', 'attachment; filename=' + file.file_name);
  }

  this.set('Content-type', type);
  this.set('Expires', new Date(2020, 1).toISOString());
  this.set('Cache-control', 'max-age=2592000');

  this.body = yield hostrFileStream(localPath, remotePath);
}

export function* resized(size, id, name) {
  yield get.call(this, id, name, size);
}

export function* landing(id, next) {
  if (id === 'config.js') {
    return yield next;
  }
  const file = yield this.db.Files.findOne({_id: id});
  this.assert(file, 404);
  if(userAgentCheck(this.headers['user-agent'])) {
    return yield get.call(this, file._id, file.file_name);
  }
  this.statsd.incr('file.landing', 1);
  const formattedFile = formatFile(file);
  yield this.render('file', {file: formattedFile});
}
