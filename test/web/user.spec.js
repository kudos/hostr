import { agent } from 'supertest';
import app from '../../app';

const request = agent(app.listen());

describe('hostr-web user', function() {
  describe('when POST /signin with invalid credentials', function() {
    it('should not redirect to /', function(done) {
      request
        .post('/signin')
        .send({'email': 'test@hostr.co', 'password': 'test-passworddeded'})
        .expect(200, done);
    });
  });

  describe('when POST /signin with valid credentials', function() {
    it('should redirect to /', function(done) {
      request
        .post('/signin')
        .send({'email': 'test@hostr.co', 'password': 'test-password'})
        .expect(302)
        .expect('Location', '/')
        .end(done);
    });
  });
});
