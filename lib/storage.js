import fs from 'fs';
import path from 'path';

function range(start, stop) {
  const result = [];
  for (let idx = start.charCodeAt(0), end = stop.charCodeAt(0); idx <= end; ++idx) {
    result.push(String.fromCharCode(idx));
  }
  return result;
}

const storePath = process.env.FILE_PATH || path.join(process.env.HOME, '.hostr', 'uploads');

const directories = range('A', 'Z').concat(range('a', 'z'), range('0', '9'));

export default function init() {
  directories.forEach((directory) => {
    if (!fs.existsSync(path.join(storePath, directory))) {
      fs.mkdirSync(path.join(storePath, directory));
      fs.mkdirSync(path.join(storePath, directory, '150'));
      fs.mkdirSync(path.join(storePath, directory, '970'));
    }
  });
}
