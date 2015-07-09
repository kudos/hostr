export function fileSize() {
  return function(input) {
    if (input >= 1073741824) {
      input = Math.round((input / 1073741824) * 10) / 10 + 'GB';
    } else {
      if (input >= 1048576) {
        input = Math.round((input / 1048576) * 10) / 10 + 'MB';
      } else {
        if (input >= 1024) {
          input = Math.round((input / 1024) * 10) / 10 + 'KB';
        } else {
          input = Math.round(input) + 'B';
        }
      }
    }
    return input;
  };
}


export function direct() {
  return function(file) {
    if(file.name) {
      if (file.direct && file.name.split('.').pop().toLowerCase() === 'psd') {
        return file.direct['970x'].replace('/970/', '/').slice(0, -4);
      } else if (file.direct && file.direct['970x']) {
        return file.direct['970x'].replace('/970/', '/');
      } else {
        return file.href.replace('hostr.co/', 'hostr.co/file/') + '/' + file.name;
      }
    }
  };
}
