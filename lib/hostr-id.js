const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function randomID() {
  let rand = '';
  for (let i = 0; i < 12; i++) {
    rand += chars.charAt(Math.floor((Math.random() * chars.length)));
  }
  return rand;
}

function* checkId(Files, fileId, attempts) {
  if (attempts > 10) {
    return false;
  }
  const file = yield Files.findOne({'_id': fileId});
  if (file === null) {
    return fileId;
  }
  return checkId(randomID(), ++attempts); // eslint-disable-line no-param-reassign
}

export default function* (Files) {
  return yield checkId(Files, randomID(), 0);
}
