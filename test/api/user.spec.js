import assert from 'assert';
import { agent } from 'supertest';
import app from '../../app';

const request = agent(app.listen());

describe('hostr-api user', function() {

  describe('when GET /user', function() {
    it('should receive a user object', function(done) {
      request
        .get('/api/user')
        .auth('test@hostr.co', 'test-password')
        .expect(function(response) {
          assert(response.body.id === '54fd04a37675bcd06213eac8');
        })
        .expect(200)
        .end(done);
    });
  });

  describe('when GET /user/token', function() {
    it('should receive a user token object', function(done) {
      request
        .get('/api/user/token')
        .auth('test@hostr.co', 'test-password')
        .expect(function(response) {
          assert(response.body.token);
        })
        .expect(200)
        .end(done);
    });
  });

  describe('when GET /user/transaction', function() {
    it('should receive a user transactions object', function(done) {
      request
        .get('/api/user/transaction')
        .auth('test@hostr.co', 'test-password')
        .expect(200)
        .expect(function(response) {
          assert(response.body instanceof Array);
        })
        .end(done);
    });
  });

  describe('when GET /user/settings', function() {
    it('should update user password', function(done) {
      request
        .post('/api/user/settings')
        .send({'current_password': 'test-password', 'new_password': 'test-password' })
        .auth('test@hostr.co', 'test-password')
        .expect(200)
        .expect(function(response) {
          assert(response.body instanceof Object);
        })
        .end(done);
    });
  });

});
