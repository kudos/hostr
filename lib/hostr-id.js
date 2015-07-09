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
  if(file === null) {
    return fileId;
  } else {
    return checkId(randomID(), attempts++);
  }
}

export default function* (Files) {
  let attempts = 0;
  return yield checkId(Files, randomID(), attempts);
}
