import fs from 'fs';
import createError from 'http-errors';
import { get as getS3 } from './s3';

import debugname from 'debug';
const debug = debugname('hostr:file-stream');

function writer(localPath, remoteRead) {
  return new Promise((resolve, reject) => {
    const localWrite = fs.createWriteStream(localPath);
    remoteRead.once('error', (err) => {
      debug('remote error', err);
      reject(createError(404));
    });

    localWrite.once('finish', () => {
      debug('local write end');
      resolve(fs.createReadStream(localPath));
    });

    remoteRead.once('readable', () => {
      debug('writing');
      remoteRead.pipe(localWrite);
    });
  });
}

export default function hostrFileStream(localPath, remotePath) {
  const localRead = fs.createReadStream(localPath);
  return new Promise((resolve, reject) => {
    localRead.once('error', () => {
      debug('not found locally');
      writer(localPath, getS3(remotePath)).then((readable) => {
        resolve(readable);
      }).catch(reject);
    });
    localRead.once('readable', () => {
      debug('found locally');
      resolve(localRead);
    });
  });
}
