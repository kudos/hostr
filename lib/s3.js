import aws from 'aws-sdk';
import s3UploadStream from 's3-upload-stream';
import debugname from 'debug';
const debug = debugname('hostr:s3');

const bucket = process.env.AWS_BUCKET || 'hostrdotcodev';

const s3 = new aws.S3();
const s3Stream = s3UploadStream(s3);

export function get(key) {
  debug('fetching file: %s', 'hostr_files/' + key);
  return s3.getObject({Bucket: bucket, Key: 'hostr_files/' + key}).createReadStream();
}

export function upload(key) {
  debug('Uploading file: %s', 'hostr_files/' + key);
  return s3Stream.upload({Bucket: bucket, Key: 'hostr_files/' + key});
}
