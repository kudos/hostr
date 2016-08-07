import fs from 'mz/fs';
import lwip from 'lwip';
import debugname from 'debug';
const debug = debugname('hostr-api:resize');

function cover(path, type, size) {
  return new Promise((resolve, reject) => {
    lwip.open(path, type, (errIn, image) => {
      debug('Image Opened');
      if (errIn) {
        reject(errIn);
      }

      image.cover(size.width, size.height, (errOut, resized) => {
        debug('Image Resized');
        if (errOut) {
          reject(errOut);
        }

        resized.toBuffer(type, (errBuf, buffer) => {
          debug('Image Buffered');
          if (errBuf) {
            reject(errBuf);
          }
          resolve(buffer);
        });
      });
    });
  });
}

function scale(path, type, size) {
  return new Promise((resolve, reject) => {
    lwip.open(path, type, (errIn, image) => {
      debug('Image Opened');
      if (errIn) {
        reject(errIn);
      }

      image.cover(size.width, size.height, (errOut, resized) => {
        debug('Image Resized');
        if (errOut) {
          reject(errOut);
        }

        resized.toBuffer(type, (errBuf, buffer) => {
          debug('Image Buffered');
          if (errBuf) {
            reject(errBuf);
          }
          resolve(buffer);
        });
      });
    });
  });
}

export default function resize(path, type, currentSize, newSize) {
  debug('Resizing');
  const ratio = 970 / currentSize.width;
  debug(newSize.width, ratio);
  if (newSize.width <= 150) {
    debug('Cover');
    return cover(path, type, newSize);
  } else if (newSize.width >= 970 && ratio < 1) {
    debug('Scale');
    newSize.height = currentSize.height * ratio; // eslint-disable-line no-param-reassign
    return scale(path, type, newSize);
  }
  debug('Copy');
  return fs.readFile(path);
}
