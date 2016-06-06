import fetch from 'node-fetch';
import FormData from 'form-data';

const apiRoot = 'https://www.virustotal.com/vtapi/v2';

export function* getFileReport(resource, apiKey = process.env.VIRUSTOTAL_KEY) {
  const form = new FormData();
  form.append('apikey', apiKey);
  form.append('resource', resource);
  return yield fetch(`${apiRoot}/file/report`, { method: 'POST' });
}
