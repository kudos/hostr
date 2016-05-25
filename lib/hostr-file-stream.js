import fs from 'fs';
import createError from 'http-errors';
import { get as getFile } from './sftp';

import debugname from 'debug';
const debug = debugname('hostr:file-stream');

export default function* hostrFileStream(localPath, remotePath) {
  const localRead = fs.createReadStream(localPath);
  return new Promise((resolve, reject) => {
    localRead.once('error', () => {
      debug('local error');
      const remoteFile = getFile(remotePath);

      remoteFile.then((remoteRead) => {
        const localWrite = fs.createWriteStream(localPath);
        localWrite.once('finish', () => {
          debug('local write end');
          resolve(fs.createReadStream(localPath));
        });
        remoteRead.pipe(localWrite);

        remoteRead.once('error', () => {
          debug('remote error');
          reject(createError(404));
        });
      });


    });
    localRead.once('readable', () => {
      debug('local readable');
      resolve(localRead);
    });
  });
}
