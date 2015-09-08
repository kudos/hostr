import cookies from 'cookie-dough';
import superagent from 'superagent';
import superagentAsPromised from 'superagent-as-promised';
const request = superagentAsPromised(superagent);

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
  return request.get('/api/file')
  .set('authorization', `Bearer ${cookies().get('token')}`)
  .then();
}

export function createUser(email, password, terms) {
  return request.post('/api/user')
  .send({email: email, password: password, terms: terms})
  .then();
}
