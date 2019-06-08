import models from '../models';

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function randomID() {
  let rand = '';
  for (let i = 0; i < 12; i += 1) {
    rand += chars.charAt(Math.floor((Math.random() * chars.length)));
  }
  return rand;
}

async function checkId(Files, fileId, attempts) {
  if (attempts > 10) {
    return false;
  }
  const file = await models.file.findByPk(fileId);
  if (file === null) {
    return fileId;
  }
  return checkId(Files, randomID(), attempts + 1);
}

export default function (Files) {
  return checkId(Files, randomID(), 0);
}
