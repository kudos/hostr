import cookies from 'cookie-dough';
import superagent from 'superagent';
import superagentAsPromised from 'superagent-promise';
const request = superagentAsPromised(superagent, Promise);

export function getToken(email, password) {
  return request.post('/api/user/token')
  .send({email: email, password: password})
  .then((response) => {
    cookies().set('token', response.body.token);
    return response;
  });
}

export function getUser() {
  return request.get('/api/user')
  .set('authorization', `Bearer ${cookies().get('token')}`)
  .then();
}

export function getFiles() {
  return request.get('/api/file?perpage=0')
  .set('authorization', `Bearer ${cookies().get('token')}`)
  .then();
}

export function createUser(email, password, terms) {
  return request.post('/api/user')
  .send({email: email, password: password, terms: terms})
  .then();
}

export function requestReset(email) {
  return request.post('/api/user/reset')
  .send({email: email})
  .then();
}

export function createStack() {
  return request.post('/api/stack')
  .set('authorization', `Bearer ${cookies().get('token')}`)
  .then();
}

export function getStack(id) {
  return request.get(`/api/stack/${id}`)
  .then();
}

export function getStacks() {
  return request.get('/api/stack/')
  .then();
}

export function uploadFile(file, stackId, progress) {
  return request.post(`/api/stack/${stackId}/file`)
  .set('authorization', `Bearer ${cookies().get('token')}`)
  .on('progress', progress)
  .attach('file', file, file.name)
  .then();
}
