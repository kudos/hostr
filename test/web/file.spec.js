import assert from 'assert';
import gm from 'gm';
import { agent } from 'supertest';
import app from '../../app';

const request = agent(app.listen());

let file = {};
describe('setup hostr-web file', function() {
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
          file = response.body;
        })
        .end(done);
    });
  });
});

describe('hostr-web file', function() {

  describe('when GET /file/:id/:name', function() {
    it('should receive an image', function(done) {
      request
        .get('/file/' + file.id + '/' + file.name)
        .expect(200)
        .expect('Content-type', 'image/jpeg')
        .expect(function(response) {
          assert(response.body.length === 194544);
        })
        .end(done);
    });
  });

  describe('when GET /file/150/:id/:name', function() {
    it('should receive a 150px wide thumbnail of the image', function(done) {
      request
        .get('/file/150/' + file.id + '/' + file.name)
        .expect(200)
        .expect('Content-type', 'image/jpeg')
        .expect(function(response) {
          gm(response.body).size((err, size) => {
            assert(size.width === 150);
          });
        })
        .end(done);
    });
  });

  describe('when GET /file/970/:id/:name', function() {
    it('should receive a 970px wide thumbnail of the image', function(done) {
      request
        .get('/file/970/' + file.id + '/' + file.name)
        .expect(200)
        .expect('Content-type', 'image/jpeg')
        .expect(function(response) {
          gm(response.body).size((err, size) => {
            assert(size.width === 970);
          });
        })
        .end(done);
    });
  });

  describe('when GET /:id', function() {
    it('should receive some HTML', function(done) {
      request
        .get('/' + file.id)
        .expect(200)
        .expect('Content-type', /text\/html/) // Could include charset
        .expect(function(response) {
          assert(response.text.indexOf('src="/file/970/' + file.id + '/' + file.name + '"') > -1);
        })
        .end(done);
    });
  });

  describe('when GET /file/:badid/:name', function() {
    it('should receive 404 and some HTML', function(done) {
      request
        .get('/notarealid')
        .expect(404)
        .expect('Content-type', /text\/html/) // Could include charset
        .end(done);
    });
  });

  describe('when GET /:bad-id', function() {
    it('should receive 404 and some HTML', function(done) {
      request
        .get('/file/notarealid/orname')
        .expect(404)
        .expect('Content-type', /text\/html/) // Could include charset
        .end(done);
    });
  });
});
