import path from 'path';
import assert from 'assert';
import { agent } from 'supertest';
import app from '../../app';

const request = agent(app.listen());

describe('hostr-api file', function file() {
  let id;

  describe('when GET /file', function getFile() {
    it('should receive a list of file objects', function listFiles(done) {
      request
        .get('/api/file')
        .auth('test@hostr.co', 'test-password')
        .expect(200)
        .expect((response) => {
          assert(response.body instanceof Array);
        })
        .end(done);
    });
  });

  describe('when POSTing a file to /file', function postFile() {
    it('should receive a new file object', function receiveFile(done) {
      this.timeout(30000);
      request
        .post('/api/file')
        .attach('file', path.join(__dirname, '..', 'fixtures', 'tall.jpg'))
        .auth('test@hostr.co', 'test-password')
        .expect(201)
        .expect((response) => {
          assert(response.body.name === 'tall.jpg');
          id = response.body.id;
        })
        .end(done);
    });
  });

  describe('when GET /file/:id', function getFileById() {
    it('should receive the file object', function receiveFile(done) {
      request
        .get('/api/file/' + id)
        .expect(200)
        .expect((response) => {
          assert(response.body.name === 'tall.jpg');
        })
        .end(done);
    });
  });

  describe('when DELETE /file/:id', function deleteFile() {
    it('should delete the file object', function deleted(done) {
      request
        .delete('/api/file/' + id)
        .auth('test@hostr.co', 'test-password')
        .expect(204, done);
    });
  });

  describe('when GET deleted /file/:id', function getDeletedFileById() {
    it('should not receive the file object', function receiveFile(done) {
      request
        .get('/api/file/' + id)
        .expect(404, done);
    });
  });
});
