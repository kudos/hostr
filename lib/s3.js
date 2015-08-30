import aws from 'aws-sdk';
import s3UploadStream from 's3-upload-stream';
import debugname from 'debug';
const debug = debugname('hostr:s3');

const s3 = new aws.S3();
const s3Stream = s3UploadStream(s3);

export function get(key) {
  debug('fetching from s3: %s', 'hostr_files/' + key);
  return s3.getObject({Bucket: process.env.AWS_BUCKET, Key: 'hostr_files/' + key}).createReadStream();
}

export function upload(key) {
  debug('sending to s3: %s', 'hostr_files/' + key);
  return s3Stream.upload({Bucket: process.env.AWS_BUCKET, Key: 'hostr_files/' + key});
}
