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
  return referrer && referrerRegexes.some(regex => referrer.match(regex));
}

function hotlinkCheck(file, userAgent, referrer) {
  return userAgentCheck(userAgent) || file.width || referrerCheck(referrer);
}

export async function get(ctx) {
  if (ctx.params.size && ['150', '970'].indexOf(ctx.params.size) < 0) {
    ctx.throw(404);
    return;
  }

  const file = await models.file.findOne({
    where: {
      id: ctx.params.id,
      name: ctx.params.name,
    },
  });
  ctx.assert(file, 404);

  if (!hotlinkCheck(file, ctx.headers['user-agent'], ctx.headers.referer)) {
    ctx.redirect(`/${file.id}`);
    return;
  }

  if (!file.width && ctx.request.query.warning !== 'on') {
    ctx.redirect(`/${file.id}`);
    return;
  }

  if (file.malware) {
    const { alert } = ctx.request.query;
    if (!alert || !alert.match(/i want to download malware/i)) {
      ctx.redirect(`/${file.id}`);
      return;
    }
  }

  let localPath = join(storePath, file.id[0], `${file.id}_${file.name}`);
  let remotePath = join(file.id[0], `${file.id}_${file.name}`);
  if (ctx.params.size > 0) {
    localPath = join(storePath, file.id[0], ctx.params.size, `${file.id}_${file.name}`);
    remotePath = join(file.id[0], ctx.params.size, `${file.id}_${file.name}`);
  }

  if (file.malware) {
    ctx.statsd.incr('file.malware.download', 1);
  }

  let type = 'application/octet-stream';
  if (file.width > 0) {
    if (ctx.params.size) {
      ctx.statsd.incr('file.view', 1);
    }
    type = mime.lookup(file.name);
  } else {
    ctx.statsd.incr('file.download', 1);
  }

  if (userAgentCheck(ctx.headers['user-agent'])) {
    ctx.set('Content-Disposition', `attachment; filename=${file.name}`);
  }

  ctx.set('Content-type', type);
  ctx.set('Expires', new Date(2020, 1).toISOString());
  ctx.set('Cache-control', 'max-age=2592000');

  if (!ctx.params.size || (ctx.params.size && ctx.params.size > 150)) {
    models.file.accessed(file.id);
  }

  ctx.body = await hostrFileStream(localPath, remotePath);
}

export async function resized(ctx) {
  await get.call(ctx);
}

export async function landing(ctx) {
  const file = await models.file.findOne({
    where: {
      id: ctx.params.id,
    },
  });
  ctx.assert(file, 404);
  if (userAgentCheck(ctx.headers['user-agent'])) {
    ctx.params.name = file.name;
    await get.call(ctx);
    return;
  }

  ctx.statsd.incr('file.landing', 1);
  const formattedFile = formatFile(file);
  await ctx.render('file', { file: formattedFile });
}
