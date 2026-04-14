import ejs from 'ejs';
import path from 'path';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';

const viewsDir = path.join(import.meta.dirname, '..', 'views');
const publicDir = path.join(import.meta.dirname, '..', 'public');

function fileHash(filepath) {
  try {
    const content = readFileSync(path.join(publicDir, filepath));
    return createHash('md5').update(content).digest('hex').slice(0, 8);
  } catch {
    return '0';
  }
}

const assetVersions = {
  app: fileHash('styles/app.css'),
  style: fileHash('styles/style.css'),
  bundle: fileHash('build/bundle.js'),
};

export async function render(c, view, locals = {}) {
  const html = await ejs.renderFile(path.join(viewsDir, `${view}.ejs`), {
    session: c.get('session') || {},
    baseURL: process.env.WEB_BASE_URL,
    apiURL: process.env.API_BASE_URL,
    assetVersions,
    ...locals,
  });
  return c.html(html);
}
