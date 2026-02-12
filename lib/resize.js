import fs from 'node:fs/promises';
import { Jimp } from 'jimp';
import debugname from 'debug';

const debug = debugname('hostr-api:resize');

const types = {
  jpg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/jpeg',
};

async function cover(path, type, size) {
  const image = await Jimp.read(path);
  debug('Image Opened');
  debug(size);
  const resized = image.cover({ w: size.width, h: size.height });
  debug('Image Resized');

  return resized.getBuffer(types[type], { quality: 80 });
}

async function scale(path, type, size) {
  const image = await Jimp.read(path);
  debug('Image Opened');

  const resized = image.cover({ w: size.width, h: size.height });
  debug('Image Resized');

  return resized.getBuffer(types[type], { quality: 80 });
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
