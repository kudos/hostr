import aws from 'aws-sdk';
import debugname from 'debug';
const debug = debugname('hostr:s3');

const s3 = new aws.S3();

export function get(key) {
  debug('fetching from s3: %s', 'hostr_files/' + key);
  return s3.getObject({Bucket: process.env.AWS_BUCKET, Key: 'hostr_files/' + key}).createReadStream();
}

export function upload(stream, key, callback) {
  debug('sending to s3: %s', 'hostr_files/' + key);
  const params = {Bucket: process.env.AWS_BUCKET, Key: 'hostr_files/' + key, Body: stream};
  const uploading = s3.upload(params);
  uploading.on('error', (err) => {
    console.log(err)
  });
  uploading.send(callback);
}
