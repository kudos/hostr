export function fileSize() {
  return (input) => {
    if (input >= 1073741824) {
      return  Math.round((input / 1073741824) * 10) / 10 + 'GB';
    }
    if (input >= 1048576) {
      return Math.round((input / 1048576) * 10) / 10 + 'MB';
    }
    if (input >= 1024) {
      return Math.round((input / 1024) * 10) / 10 + 'KB';
    }
    return Math.round(input) + 'B';
  };
}


export function direct() {
  return (file) => {
    if (file.name) {
      if (file.direct && file.name.split('.').pop().toLowerCase() === 'psd') {
        return file.direct['970x'].replace('/970/', '/').slice(0, -4);
      }
      if (file.direct && file.direct['970x']) {
        return file.direct['970x'].replace('/970/', '/');
      }
      return file.href.replace('hostr.co/', 'hostr.co/file/') + '/' + file.name;
    }
  };
}
