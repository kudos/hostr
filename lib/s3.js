import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import debugname from 'debug';

const debug = debugname('hostr:s3');

const client = new S3Client({
  endpoint: process.env.AWS_ENDPOINT,
  forcePathStyle: true,
});

export async function get(key) {
  let fullKey = `uploads/${key}`;
  if (key.substr(2, 5) === '970/' || key.substr(2, 5) === '150/') {
    fullKey = `uploads/${key.substr(2)}`;
  }
  debug('fetching from s3: %s', fullKey);
  try {
    const response = await client.send(
      new GetObjectCommand({ Bucket: process.env.AWS_BUCKET, Key: fullKey }),
    );
    return response.Body;
  } catch (err) {
    debug('S3 error', err);
    throw err;
  }
}

export function upload(stream, key) {
  debug(`sending to s3: uploads/'${key}`);
  const params = { Bucket: process.env.AWS_BUCKET, Key: `uploads/${key}`, Body: stream };
  const uploading = new Upload({ client, params });
  uploading.on('error', (err) => {
    debug('S3 Error', err);
  });
  uploading.done().catch((err) => {
    debug('S3 Upload Error', err);
  });
  return uploading;
}
