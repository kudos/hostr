export function fileSize(input) {
  if (input >= 1073741824) return Math.round((input / 1073741824) * 10) / 10 + 'GB';
  if (input >= 1048576) return Math.round((input / 1048576) * 10) / 10 + 'MB';
  if (input >= 1024) return Math.round((input / 1024) * 10) / 10 + 'KB';
  return Math.round(input) + 'B';
}

export function directUrl(file) {
  if (!file?.name) return null;
  if (file.direct?.['970x']) {
    const base = file.direct['970x'].replace('/970/', '/');
    return file.name.split('.').pop().toLowerCase() === 'psd' ? base.slice(0, -4) : base;
  }
  return file.href.replace('hostr.co/', 'hostr.co/file/') + '/' + file.name;
}

export function formatDate(iso) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en', { day: 'numeric', month: 'short', year: '2-digit' }) +
    ' at ' +
    d.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })
  );
}

export function guid() {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}
