import path from 'path';
import mime from 'mime-types';
import hostrFileStream from '../../lib/hostr-file-stream';
import { formatFile } from '../../lib/format';

const storePath = process.env.UPLOAD_STORAGE_PATH;

function userAgentCheck(userAgent) {
  if (!userAgent) {
    return false;
  }
  return userAgent.match(/^(wget|curl|vagrant)/i);
}

function hotlinkCheck(file, userAgent, referrer) {
  return !userAgentCheck(userAgent) && !file.width && (!referrer || !(referrer.match(/^https:\/\/hostr.co/) || referrer.match(/^http:\/\/localhost:4040/)));
}

export function* get() {
  const file = yield this.db.Files.findOne({_id: this.params.id, 'file_name': this.params.name, 'status': 'active'});
  this.assert(file, 404);

  if (hotlinkCheck(file, this.headers['user-agent'], this.headers.referer)) {
    return this.redirect('/' + file._id);
  }

  if (!file.width && this.request.query.warning !== 'on') {
    return this.redirect('/' + file._id);
  }

  if (file.malware) {
    const alert = this.request.query.alert;
    if (!alert || !alert.match(/i want to download malware/i)) {
      return this.redirect('/' + file._id);
    }
  }

  let localPath = path.join(storePath, file._id[0], file._id + '_' + file.file_name);
  let remotePath = path.join(file._id[0], file._id + '_' + file.file_name);
  if (this.params.size > 0) {
    localPath = path.join(storePath, file._id[0], this.params.size, file._id + '_' + file.file_name);
    remotePath = path.join(file._id[0], this.params.size, file._id + '_' + file.file_name);
  }

  if (file.malware) {
    this.statsd.incr('file.malware.download', 1);
  }

  let type = 'application/octet-stream';
  if (file.width > 0) {
    if (this.params.size) {
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

  if (!this.params.size || (this.params.size && this.params.size > 150)) {
    this.db.Files.updateOne(
      {'_id': file._id},
      {'$set': {'last_accessed': Math.ceil(Date.now() / 1000)}, '$inc': {downloads: 1}},
      {'w': 0}
    );
  }

  this.body = yield hostrFileStream(localPath, remotePath);
}

export function* resized() {
  yield get.call(this);
}

export function* landing() {
  const file = yield this.db.Files.findOne({_id: this.params.id, status: 'active'});
  this.assert(file, 404);
  if (userAgentCheck(this.headers['user-agent'])) {
    this.params.name = file.file_name;
    return yield get.call(this);
  }

  this.statsd.incr('file.landing', 1);
  const formattedFile = formatFile(file);
  yield this.render('file', {file: formattedFile});
}
