import path from 'path';
import mime from 'mime-types';
import hostrFileStream from '../../lib/hostr-file-stream';
import { formatFile } from '../../lib/format';
import normalisedUser from '../../lib/normalised-user.js';

import { createStore } from 'redux';

import { routes } from '../public/app/src/app';
import reducers from '../public/app/src/reducers';
import { renderPage } from '../lib/react-handler';

const storePath = process.env.UPLOAD_STORAGE_PATH;

function userAgentCheck(userAgent) {
  if (!userAgent) {
    return false;
  }
  return userAgent.match(/^(wget|curl|vagrant)/i);
}

function hotlinkCheck(file, userAgent, referrer) {
  if (file.width) {
    return true;
  } else if (userAgentCheck(userAgent)) {
    return true;
  } else if (referrer && (referrer.match(/^https:\/\/hostr\.co/) || referrer.match(/^https?:\/\/localhost\.hostr\.co/))) {
    return true;
  }
  return false;
}

export function* get() {
  const file = yield this.rethink
    .table('files')
    .get(this.params.id);

  this.assert(file && file.name === this.params.name && file.status === 'active', 404);

  if (this.request.headers['if-none-match'] && file.md5) {
    if (this.request.headers['if-none-match'].indexOf(file.md5) >= 0) {
      this.status = 304;
      return;
    }
  }

  if (!hotlinkCheck(file, this.headers['user-agent'], this.headers.referer)) {
    this.redirect('/' + file._id);
    return;
  }

  if (!file.width && this.request.query.warning !== 'on') {
    this.redirect('/' + file._id);
    return;
  }

  if (file.malware) {
    const alert = this.request.query.alert;
    if (!alert || !alert.match(/i want to download malware/i)) {
      this.redirect('/' + file._id);
      return;
    }
  }

  let localPath = path.join(storePath, file.id[0], file.id + '_' + file.name);
  let remotePath = path.join(file.id[0], file.id + '_' + file.name);
  if (this.params.size > 0) {
    localPath = path.join(storePath, file.id[0], this.params.size, file.id + '_' + file.name);
    remotePath = path.join(this.params.size, file.id + '_' + file.name);
  }

  if (file.malware) {
    this.statsd.incr('file.malware.download', 1);
  }

  let type = 'application/octet-stream';
  if (file.width > 0) {
    if (this.params.size) {
      this.statsd.incr('file.view', 1);
    }
    type = mime.lookup(file.name);
  } else {
    this.statsd.incr('file.download', 1);
  }

  if (userAgentCheck(this.headers['user-agent'])) {
    this.set('Content-Disposition', 'attachment; filename=' + file.name);
  }

  this.set('Content-type', type);
  this.set('Expires', new Date(2020, 1).toISOString());
  this.set('Cache-control', 'max-age=2592000');
  if (file.md5) {
    if (this.params.size) {
      this.set('Etag', file.md5 + '+' + this.params.size);
    } else {
      this.set('Etag', file.md5);
    }
  }

  if (!this.params.size || (this.params.size && this.params.size > 150)) {
    yield this.rethink
      .table('files')
      .get(file.id)
      .update({
        accessedCount: this.rethink.row('accessedCount').add(1).default(0),
        accessed: new Date(),
      });
  }
  this.status = 200;
  this.body = yield hostrFileStream(localPath, remotePath);
}

export function* resized() {
  yield get.call(this);
}

export function* landing() {
  const file = yield this.rethink
    .table('files')
    .get(this.params.id);
  this.assert(file && file.status === 'active', 404);
  if (userAgentCheck(this.headers['user-agent'])) {
    this.params.name = file.name;
    return yield get.call(this);
  }

  const userId = this.state.user;
  let files = [];
  let user = {};
  if (userId) {
    user = normalisedUser.call(this, user);
    files = yield this.rethink
      .table('files')
      .getAll(this.state.user, {index: 'userId'})
      .filter(this.rethink.row('status').ne('deleted'), {default: true});
  }

  const store = createStore(reducers, {file: formatFile(file), user, files: files.map(formatFile)});

  this.body = yield renderPage(routes, this.request.url, store);

  this.statsd.incr('file.landing', 1);
}
