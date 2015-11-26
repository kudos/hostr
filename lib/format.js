const baseURL = process.env.WEB_BASE_URL;

export function formatSize(size) {
  if (size >= 1073741824) {
    return Math.round((size / 1073741824) * 10) / 10 + 'GB';
  }
  if (size >= 1048576) {
    return Math.round((size / 1048576) * 10) / 10 + 'MB';
  }
  if (size >= 1024) {
    return Math.round((size / 1024) * 10) / 10 + 'KB';
  }
  return Math.round(size) + 'B';
}

export function formatFile(file) {
  file.href = baseURL + '/' + file.stackId + '/' + file.id;
  if (file.width) {
    const ext = (file.name.split('.').pop().toLowerCase() === 'psd' ? '.png' : '');
    file.direct = {
      thumb: baseURL + '/file/150/' + file.id + '/' + file.name + ext,
      medium: baseURL + '/file/970/' + file.id + '/' + file.name + ext,
      full: baseURL + '/file/' + file.id + '/' + file.name + ext,
    };
  }
  return file;
}
