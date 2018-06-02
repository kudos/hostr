import fs from 'mz/fs';
import jimp from 'jimp';
import debugname from 'debug';

const debug = debugname('hostr-api:resize');

const types = {
  jpg: jimp.MIME_JPEG,
  png: jimp.MIME_PNG,
  gif: jimp.MIME_JPEG,
};

function cover(path, type, size) {
  return new Promise((resolve, reject) => {
    jimp.read(path, (errIn, image) => {
      debug('Image Opened');
      if (errIn) {
        reject(errIn);
      }

      image.quality(80).cover(size.width, size.height, (errOut, resized) => {
        debug('Image Resized');
        if (errOut) {
          reject(errOut);
        }

        resized.getBuffer(types[type], (errBuf, buffer) => {
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
    jimp.read(path, (errIn, image) => {
      debug('Image Opened');
      if (errIn) {
        reject(errIn);
      }

      image.quality(80).cover(size.width, size.height, (errOut, resized) => {
        debug('Image Resized');
        if (errOut) {
          reject(errOut);
        }

        resized.getBuffer(types[type], (errBuf, buffer) => {
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
