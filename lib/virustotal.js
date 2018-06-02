import fetch from 'node-fetch';
import FormData from 'form-data';

const apiRoot = 'https://www.virustotal.com/vtapi/v2';

export default async (resource, apiKey = process.env.VIRUSTOTAL_KEY) => {
  const form = new FormData();
  form.append('apikey', apiKey);
  form.append('resource', resource);
  return fetch(`${apiRoot}/file/report`, { method: 'POST' });
};
