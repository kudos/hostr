import fs from 'mz/fs';
import { join } from 'path';
import assert from 'assert';
import tmp from 'tmp';
import resize from '../../lib/resize';
import sizeOf from 'image-size';

function testResize(path, done) {
  const size = sizeOf(path);
  resize(path, size.type, size, {width: 100, height: 100}).then((image) => {
    const tmpFile = tmp.tmpNameSync() + '.' + size.type;
    fs.writeFile(tmpFile, image).then(() => {
      const newSize = sizeOf(fs.readFileSync(tmpFile));
      assert(newSize.type === size.type);
      done();
    });
  });
}

describe('Image resizing', () => {
  it('should resize a jpg', (done) => {
    const path = join(__dirname, '..', 'fixtures', 'utah-arches.jpg');
    testResize(path, done);
  });

  it('should resize a png', (done) => {
    const path = join(__dirname, '..', 'fixtures', 'app-icon.png');
    testResize(path, done);
  });

  it('should resize a gif', (done) => {
    const path = join(__dirname, '..', 'fixtures', 'kim.gif');
    testResize(path, done);
  });
});
