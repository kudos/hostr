const apiURL = window.settings.apiURL;

function authHeader() {
  return window.user ? { 'Authorization': ':' + window.user.token } : {};
}

async function call(path, options = {}) {
  const res = await fetch(apiURL + path, {
    ...options,
    headers: { ...authHeader(), ...options.headers },
  });
  if (res.status === 401) {
    window.location = '/logout';
    return null;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message || res.statusText);
  }
  return res.json();
}

export const getFiles = () => call('/file?perpage=0&all=true');
export const getUser = () => call('/user');
export const deleteFile = (id) => call('/file/' + id, { method: 'DELETE' });
export const updateSettings = (data) =>
  call('/user/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
export const deleteAccount = (data) =>
  call('/user/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
