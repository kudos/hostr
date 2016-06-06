import moment from 'moment';
import { sniff } from './type';

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
    added: moment.unix(file.time_added).format(),
    readableAdded: formatDate(file.time_added),
    downloads: file.downloads !== undefined ? file.downloads : 0,
    href: `${baseURL}/${file._id}`,
    id: file._id,
    name: file.file_name,
    size: file.file_size,
    readableSize: formatSize(file.file_size),
    type: sniff(file.file_name),
    trashed: (file.status === 'trashed'),
    status: file.status,
  };

  if (file.width) {
    formattedFile.height = file.height;
    formattedFile.width = file.width;
    const ext = (file.file_name.split('.').pop().toLowerCase() === 'psd' ? '.png' : '');
    formattedFile.direct = {
      '150x': `${baseURL}/file/150/${file._id}/${file.file_name}${ext}`,
      '970x': `${baseURL}/file/970/${file._id}/${file.file_name}${ext}`,
    };
  }
  return formattedFile;
}
