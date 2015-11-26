const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function randomID() {
  let rand = '';
  for (let idx = 0; idx < 12; idx++) {
    rand += chars.charAt(Math.floor((Math.random() * chars.length)));
  }
  return rand;
}

function* checkId(fileId, attempts) {
  if (attempts > 10) {
    return false;
  }
  const file = yield this.rethink.table('files').get(fileId);
  if (file === null) {
    return fileId;
  }
  return checkId(randomID(), ++attempts); // eslint-disable-line no-param-reassign
}

export default function* () {
  return yield checkId.call(this, randomID(), 0);
}
