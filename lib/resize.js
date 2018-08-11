import fs from 'mz/fs';
import jimp from 'jimp';
import debugname from 'debug';

const debug = debugname('hostr-api:resize');

const types = {
  jpg: jimp.MIME_JPEG,
  png: jimp.MIME_PNG,
  gif: jimp.MIME_JPEG,
};

const align = jimp.HORIZONTAL_ALIGN_CENTER | jimp.VERTICAL_ALIGN_MIDDLE;

async function cover(path, type, size) {
  const image = await jimp.read(path);
  debug('Image Opened');
  debug(size);
  const resized = await image.cover(size.width, size.height, align);
  debug('Image Resized');

  return await resized.quality(80).getBufferAsync(types[type]);
}

async function scale(path, type, size) {
  const image = await jimp.read(path);
  debug('Image Opened');

  const resized = await image.cover(size.width, size.height, align);
  debug('Image Resized');

  return await resized.quality(80).getBufferAsync(types[type]);
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
