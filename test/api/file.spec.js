import assert from 'assert';
import { agent } from 'supertest';
import app from '../../app';

const request = agent(app.listen());

describe('hostr-api file', function() {

  let id;

  describe('when GET /file', function() {
    it('should receive a list of file objects', function(done) {
      request
        .get('/api/file')
        .auth('test@hostr.co', 'test-password')
        .expect(200)
        .expect(function(response) {
          assert(response.body instanceof Array);
        })
        .end(done);
    });
  });

  describe('when POSTing a file to /file', function() {
    it('should receive a new file object', function(done) {
      this.timeout(30000);
      request
        .post('/api/file')
        .attach('file', 'test/fixtures/utah-arches.jpg')
        .auth('test@hostr.co', 'test-password')
        .expect(201)
        .expect(function(response) {
          assert(response.body.name === 'utah-arches.jpg');
          id = response.body.id;
        })
        .end(done);
    });
  });

  describe('when GET /file/:id', function() {
    it('should receive the file object', function(done) {
      request
        .get('/api/file/' + id)
        .expect(200)
        .expect(function(response) {
          assert(response.body.name === 'utah-arches.jpg');
        })
        .end(done);
    });
  });

  describe('when DELETE /file/:id', function() {
    it('should delete the file object', function(done) {
      request
        .delete('/api/file/' + id)
        .auth('test@hostr.co', 'test-password')
        .expect(204, done);
    });
  });

  describe('when GET deleted /file/:id', function() {
    it('should not receive the file object', function(done) {
      request
        .get('/api/file/' + id)
        .expect(404, done);
    });
  });
});
