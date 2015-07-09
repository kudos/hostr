import { agent } from 'supertest';
import app from '../../api/app';

const request = agent(app.listen());

describe('hostr-api auth', function(){

  describe('with no credentials', function(){
    it('should `throw` 401', function(done){
      request
        .get('/user')
        .expect(401, done);
    });
  });

  describe('with invalid credentials', function(){
    it('should `throw` 401', function(done){
      request
        .get('/user')
        .auth('user', 'invalid password')
        .expect(401, done);
    });
  });

  describe('with valid credentials', function(){
    it('should call the next middleware', function(done){
      request
        .get('/')
        .auth('test@hostr.co', 'test-password')
        .expect(200, done);
    });
  });
});
