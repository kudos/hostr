const extensions = {
  'jpg': 'image',
  'jpeg': 'image',
  'png': 'image',
  'gif': 'image',
  'bmp': 'image',
  'tiff': 'image',
  'psd': 'image',
  'mp3': 'audio',
  'm4a': 'audio',
  'ogg': 'audio',
  'flac': 'audio',
  'aac': 'audio',
  'mpg': 'video',
  'mkv': 'video',
  'avi': 'video',
  'divx': 'video',
  'mpeg': 'video',
  'flv': 'video',
  'mp4': 'video',
  'mov': 'video',
  'zip': 'archive',
  'gz': 'archive',
  'tgz': 'archive',
  'bz2': 'archive',
  'rar': 'archive',
};

export function sniff(filename) {
  if (extensions[filename.split('.').pop().toLowerCase()]) {
    return extensions[filename.split('.').pop().toLowerCase()];
  }
  return 'other';
}
