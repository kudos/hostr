import moment from 'moment';
import sniff from './sniff';

const baseURL = process.env.WEB_BASE_URL;

export function formatDate(timestamp) {
  return moment.unix(timestamp).format('D MMM YY [at] h:mm A');
}

export function formatSize(size) {
  if (size >= 1073741824) {
    return `${Math.round((size / 1073741824) * 10) / 10}GB`;
  }
  if (size >= 1048576) {
    return `${Math.round((size / 1048576) * 10) / 10}MB`;
  }
  if (size >= 1024) {
    return `${Math.round((size / 1024) * 10) / 10}KB`;
  }
  return `${Math.round(size)}B`;
}

export function formatFile(file) {
  const formattedFile = {
    added: moment.unix(file.createdAt / 1000).format(),
    readableAdded: formatDate(file.createdAt / 1000),
    downloads: file.downloads !== undefined ? file.downloads : 0,
    href: `${baseURL}/${file.id}`,
    id: file.id,
    name: file.name,
    size: file.size,
    readableSize: formatSize(file.size),
    type: sniff(file.name),
    trashed: (file.status === 'trashed'),
    status: file.processed === true ? 'active' : 'uploading',
  };

  if (file.width) {
    formattedFile.height = file.height;
    formattedFile.width = file.width;
    const ext = (file.name.split('.').pop().toLowerCase() === 'psd' ? '.png' : '');
    formattedFile.direct = {
      '150x': `${baseURL}/file/150/${file.id}/${file.name}${ext}`,
      '970x': `${baseURL}/file/970/${file.id}/${file.name}${ext}`,
    };
  }
  return formattedFile;
}
