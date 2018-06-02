import aws from 'aws-sdk';
import debugname from 'debug';
const debug = debugname('hostr:s3');

const s3 = new aws.S3({
  endpoint: process.env.AWS_ENDPOINT,
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
});

export function get(key) {
  let fullKey = `uploads/${key}`;
  if (key.substr(2, 5) === '970/' || key.substr(2, 5) === '150/') {
    fullKey = `uploads/${key.substr(2)}`;
  }
  debug('fetching from s3: %s', fullKey);
  return s3.getObject({ Bucket: process.env.AWS_BUCKET, Key: fullKey })
    .createReadStream()
    .on('error', (err) => {
      debug('S3 error', err);
    });
}

export function upload(stream, key, callback) {
  debug(`sending to s3: uploads/'${key}`);
  const params = { Bucket: process.env.AWS_BUCKET, Key: `uploads/${key}`, Body: stream };
  const uploading = s3.upload(params);
  uploading.on('error', (err) => {
    debug('S3 Error', err);
  });
  uploading.send(callback);
  return uploading;
}
