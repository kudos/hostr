import { dirname } from 'path';
import Client from 'ssh2-sftp-client';
import debugname from 'debug';
const debug = debugname('hostr:sftp');

export function get(remotePath) {
  const sftp = new Client();
  return sftp.connect({
    host: process.env.SFTP_HOST,
    port: process.env.SFTP_PORT,
    username: process.env.SFTP_USERNAME,
    password: process.env.SFTP_PASSWORD,
  }).then(() => {
    return sftp.get('hostr/uploads/' + remotePath, true);
  });
}

export function upload(localPath, remotePath) {
  debug('SFTP connecting');
  const sftp = new Client();
  return sftp.connect({
    host: process.env.SFTP_HOST,
    port: process.env.SFTP_PORT,
    username: process.env.SFTP_USERNAME,
    password: process.env.SFTP_PASSWORD,
  }).then(() => {
    return sftp.put(localPath, remotePath, true).then(() => {
      sftp.end();
    });
  }).catch(() => {
    debug('Creating ' + dirname(remotePath));
    return sftp.mkdir(dirname(remotePath), true).then(() => {
      return sftp.put(localPath, remotePath, true).then(() => {
        sftp.end();
      });
    });
  }).then(() => {
    sftp.end();
  });
}
