import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import debugname from 'debug';
const debug = debugname('hostr:storage');

function range(start, stop) {
  const result = [];
  for (let idx = start.charCodeAt(0), end = stop.charCodeAt(0); idx <= end; ++idx) {
    result.push(String.fromCharCode(idx));
  }
  return result;
}

const storePath = process.env.UPLOAD_STORAGE_PATH;

const directories = range('A', 'Z').concat(range('a', 'z'), range('0', '9'));

export default function init() {
  debug(`Creating upload directories at: ${process.env.UPLOAD_STORAGE_PATH}`);
  mkdirp(process.env.UPLOAD_STORAGE_PATH, (err) => {
    if (err) debug(err);
    directories.forEach((directory) => {
      if (!fs.existsSync(path.join(storePath, directory))) {
        fs.mkdirSync(path.join(storePath, directory));
        fs.mkdirSync(path.join(storePath, directory, '150'));
        fs.mkdirSync(path.join(storePath, directory, '970'));
      }
    });
  });
}
