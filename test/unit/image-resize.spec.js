import fs from 'fs';
import path from 'path';
import assert from 'assert';
import tmp from 'tmp';
import resize from '../../lib/resize';

const file = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'utah-arches.jpg'));

describe('Image resizing', function() {
  it('should resize an image', function*() {
    const imageBuffer = yield resize(file, {height: 100, width: 100});
    const tmpFile = tmp.tmpNameSync();
    fs.writeFileSync(tmpFile + '.jpg', imageBuffer);
    assert(tmpFile);
  });
});
