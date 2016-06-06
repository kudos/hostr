import { dirname, join } from 'path';
import Client from './ssh2-sftp-client';
import debugname from 'debug';
const debug = debugname('hostr:sftp');

export function get(remotePath) {
  debug('fetching', join('hostr', 'uploads', remotePath));
  const sftp = new Client();
  return sftp.connect({
    host: process.env.SFTP_HOST,
    port: process.env.SFTP_PORT,
    username: process.env.SFTP_USERNAME,
    password: process.env.SFTP_PASSWORD,
  })
  .then(() => sftp.get(join('hostr', 'uploads', remotePath), { encoding: null }));
}

export function upload(localPath, remotePath) {
  const sftp = new Client();
  return sftp.connect({
    host: process.env.SFTP_HOST,
    port: process.env.SFTP_PORT,
    username: process.env.SFTP_USERNAME,
    password: process.env.SFTP_PASSWORD,
  })
  .then(() => sftp.put(localPath, remotePath, true))
  .catch(() => sftp.mkdir(dirname(remotePath), true)
    .then(() => sftp.put(localPath, remotePath, true)));
}
