import fs from 'fs';
import createError from 'http-errors';
import { get as getSFTP } from './sftp';

import debugname from 'debug';
const debug = debugname('hostr:file-stream');

function writer(localPath, remoteRead) {
  return new Promise((resolve, reject) => {
    remoteRead.once('error', () => {
      debug('remote error');
      reject(createError(404));
    });
    const localWrite = fs.createWriteStream(localPath);
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
      getSFTP(remotePath)
      .then((remoteRead) => writer(localPath, remoteRead))
        .then(resolve)
        .catch((err) => {
          debug('not on sftp', err);
        });
    });
    localRead.once('readable', () => {
      debug('found locally');
      resolve(localRead);
    });
  });
}
