import { join } from 'path';
import mime from 'mime-types';
import models from '../../models';
import hostrFileStream from '../../lib/hostr-file-stream';
import { formatFile } from '../../lib/format';

const storePath = process.env.UPLOAD_STORAGE_PATH;

const referrerRegexes = [
  /^https:\/\/hostr.co/,
  /^https:\/\/localhost.hostr.co/,
  /^http:\/\/localhost:4040/,
];

function userAgentCheck(userAgent) {
  if (!userAgent) {
    return false;
  }
  return userAgent.match(/^(wget|curl|vagrant)/i);
}

function referrerCheck(referrer) {
  return referrer && referrerRegexes.some((regex) => referrer.match(regex));
}

function hotlinkCheck(file, userAgent, referrer) {
  return userAgentCheck(userAgent) || file.width || referrerCheck(referrer);
}

export function* get() {
  if (this.params.size && ['150', '970'].indexOf(this.params.size) < 0) {
    this.throw(404);
    return;
  }

  const file = yield models.file.findOne({
    where: {
      id: this.params.id,
      name: this.params.name,
      status: 'active',
    },
  });
  this.assert(file, 404);

  if (!hotlinkCheck(file, this.headers['user-agent'], this.headers.referer)) {
    this.redirect(`/${file.id}`);
    return;
  }

  if (!file.width && this.request.query.warning !== 'on') {
    this.redirect(`/${file.id}`);
    return;
  }

  if (file.malware) {
    const alert = this.request.query.alert;
    if (!alert || !alert.match(/i want to download malware/i)) {
      this.redirect(`/${file.id}`);
      return;
    }
  }

  let localPath = join(storePath, file.id[0], `${file.id}_${file.name}`);
  let remotePath = join(file.id[0], `${file.id}_${file.name}`);
  if (this.params.size > 0) {
    localPath = join(storePath, file.id[0], this.params.size, `${file.id}_${file.name}`);
    remotePath = join(file.id[0], this.params.size, `${file.id}_${file.name}`);
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
    this.set('Content-Disposition', `attachment; filename=${file.name}`);
  }

  this.set('Content-type', type);
  this.set('Expires', new Date(2020, 1).toISOString());
  this.set('Cache-control', 'max-age=2592000');

  if (!this.params.size || (this.params.size && this.params.size > 150)) {
    models.file.accessed(file.id);
  }

  this.body = yield hostrFileStream(localPath, remotePath);
}

export function* resized() {
  yield get.call(this);
}

export function* landing() {
  const file = yield models.file.findOne({
    where: {
      id: this.params.id,
      status: 'active',
    },
  });
  this.assert(file, 404);
  if (userAgentCheck(this.headers['user-agent'])) {
    this.params.name = file.name;
    yield get.call(this);
    return;
  }

  this.statsd.incr('file.landing', 1);
  const formattedFile = formatFile(file);
  yield this.render('file', { file: formattedFile });
}
