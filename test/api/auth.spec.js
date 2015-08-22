import { agent } from 'supertest';
import app from '../../app';

const request = agent(app.listen());

describe('hostr-api auth', function(){

  describe('with no credentials', function(){
    it('should `throw` 401', function(done){
      request
        .get('/api/user')
        .expect(401, done);
    });
  });

  describe('with invalid credentials', function(){
    it('should `throw` 401', function(done){
      request
        .get('/api/user')
        .auth('user', 'invalid password')
        .expect(401, done);
    });
  });

  describe('with valid credentials', function(){
    it('should 404', function(done){
      request
        .get('/api/')
        .auth('test@hostr.co', 'test-password')
        .expect('Content-type', /application\/json/)
        .expect(404, done);
    });
  });
});
