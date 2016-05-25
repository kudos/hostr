import { agent } from 'supertest';
import app from '../../app';

const request = agent(app.listen());

describe('hostr-web user', function() {
  describe('when POST /signin with invalid credentials', function() {
    it('should not redirect to /', function() {
      request.get('/signin').end(function(err, response) {
        const match = response.text.match(/name="_csrf" value="([^"]+)"/);
        const csrf = match[1];
        request
          .post('/signin')
          .send({'email': 'test@hostr.co', 'password': 'test-passworddeded', '_csrf': csrf})
          .expect(200);
      });
    });
  });

  describe('when POST /signin with valid credentials', function() {
    it('should redirect to /', function() {
      request.get('/signin').end(function(err, response) {
        const match = response.text.match(/name="_csrf" value="([^"]+)"/);
        const csrf = match[1];
        request
          .post('/signin')
          .send({'email': 'test@hostr.co', 'password': 'test-password', '_csrf': csrf})
          .expect(302)
          .expect('Location', '/')
          .end();
      });
    });
  });
});
