import debugname from 'debug';
const debug = debugname('hostr-api:resize');
import lwip from 'lwip';
import imageType from 'image-type';

const supported = ['jpg', 'png', 'gif'];

export default function(input, size) {
  debug('Resizing');

  const type = imageType(input);

  if (!type.ext || supported.indexOf(type.ext) < 0) {
    throw new Error('Not a supported image.');
  }

  return new Promise((resolve, reject) => {
    lwip.open(input, type.ext, (errIn, image) => {
      if (errIn) {
        return reject(errIn);
      }
      image.cover(size.width, size.height, (errOut, resized) => {
        if (errOut) {
          return reject(errOut);
        }

        resized.toBuffer(type.ext, (errBuf, buffer) => {
          resolve(buffer);
        });
      });
    });
  });
}
