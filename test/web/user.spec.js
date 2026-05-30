import { agent } from 'supertest';
import { getRequestListener } from '@hono/node-server';
import app from '../../app.js';

const request = agent(getRequestListener(app.fetch));

describe('hostr-web user', function() {
  describe('when POST /signin with invalid credentials', function() {
    it('should not redirect to /', function(done) {
      request.get('/signin').end(function(err, response) {
        if (err) return done(err);
        const match = response.text.match(/name="_csrf" value="([^"]+)"/);
        const csrf = match[1];
        request
          .post('/signin')
          .type('form')
          .send({'email': 'test@hostr.co', 'password': 'test-passworddeded', '_csrf': csrf})
          .expect(200)
          .end(done);
      });
    });
  });

  describe('when POST /signin with valid credentials', function() {
    it('should redirect to /', function(done) {
      request.get('/signin').end(function(err, response) {
        if (err) return done(err);
        const match = response.text.match(/name="_csrf" value="([^"]+)"/);
        const csrf = match[1];
        request
          .post('/signin')
          .type('form')
          .send({'email': 'test@hostr.co', 'password': 'test-password', '_csrf': csrf})
          .expect(302)
          .expect('Location', '/')
          .end(done);
      });
    });
  });
});
