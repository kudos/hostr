import aws from 'aws-sdk';
import debugname from 'debug';
const debug = debugname('hostr:s3');

const s3 = new aws.S3();

export function get(key) {
  let fullKey = `hostr_files/${key}`;
  if (key.substr(2, 5) === '970/' || key.substr(2, 5) === '150/') {
    fullKey = `hostr_files/${key.substr(2)}`;
  }
  debug('fetching from s3: %s', fullKey);
  return s3.getObject({ Bucket: process.env.AWS_BUCKET, Key: fullKey }).createReadStream();
}
