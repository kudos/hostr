import { join } from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import mime from 'mime-types';
import { HTTPException } from 'hono/http-exception';
import models from '../../models/index.js';
import { formatFile } from '../../lib/format.js';
import { render } from '../lib/render.js';

const storePath = process.env.UPLOAD_STORAGE_PATH;

const referrerRegexes = [
  /^https:\/\/hostr.co/,
  /^https:\/\/localhost.hostr.co/,
  /^http:\/\/localhost:4040/,
];

function userAgentCheck(userAgent) {
  if (!userAgent) return false;
  return userAgent.match(/^(wget|curl|vagrant)/i);
}

function referrerCheck(referrer) {
  return referrer && referrerRegexes.some((regex) => referrer.match(regex));
}

function hotlinkCheck(file, userAgent, referrer) {
  return userAgentCheck(userAgent) || file.width || referrerCheck(referrer);
}

async function serveFile(c, file, size) {
  let localPath = join(storePath, file.id[0], `${file.id}_${file.name}`);
  if (size > 0) {
    localPath = join(storePath, file.id[0], String(size), `${file.id}_${file.name}`);
  }

  let type = 'application/octet-stream';
  if (file.width > 0) {
    type = mime.lookup(file.name) || type;
  }

  if (userAgentCheck(c.req.header('user-agent'))) {
    c.header('Content-Disposition', `attachment; filename=${file.name}`);
  }

  c.header('Content-Type', type);
  c.header('Expires', new Date(2020, 1).toISOString());
  c.header('Cache-Control', 'max-age=2592000');

  if (!size || size > 150) {
    models.file.accessed(file.id);
  }

  if (!fs.existsSync(localPath)) {
    throw new HTTPException(404);
  }
  return c.body(Readable.toWeb(fs.createReadStream(localPath)));
}

export async function get(c) {
  const size = c.req.param('size') ? parseInt(c.req.param('size'), 10) : null;
  if (size !== null && ![150, 970].includes(size)) {
    throw new HTTPException(404);
  }

  const file = await models.file.findOne({
    where: { id: c.req.param('id'), name: c.req.param('name') },
  });
  if (!file) throw new HTTPException(404);

  const userAgent = c.req.header('user-agent');
  const referer = c.req.header('referer');

  if (!hotlinkCheck(file, userAgent, referer)) {
    return c.redirect(`/${file.id}`);
  }
  if (!file.width && c.req.query('warning') !== 'on') {
    return c.redirect(`/${file.id}`);
  }
  if (file.malware) {
    const alert = c.req.query('alert');
    if (!alert || !alert.match(/i want to download malware/i)) {
      return c.redirect(`/${file.id}`);
    }
  }

  return serveFile(c, file, size);
}

export async function landing(c) {
  const file = await models.file.findOne({ where: { id: c.req.param('id') } });
  if (!file) throw new HTTPException(404);

  if (userAgentCheck(c.req.header('user-agent'))) {
    return serveFile(c, file, null);
  }

  return render(c, 'file', { file: formatFile(file) });
}
