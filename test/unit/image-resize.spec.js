import fs from 'fs';
import path from 'path';
import assert from 'assert';
import tmp from 'tmp';
import resize from '../../lib/resize';
import imageType from 'image-type';

describe('Image resizing', () => {
  it('should resize a jpg', function* resizeImage() {
    const file = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'utah-arches.jpg'));
    const imageBuffer = yield resize(file, {height: 100, width: 100});
    const tmpFile = tmp.tmpNameSync() + '.jpg';
    fs.writeFileSync(tmpFile, imageBuffer);
    const type = imageType(fs.readFileSync(tmpFile));
    assert(type.ext === 'jpg');
  });

  it('should resize a png', function* resizeImage() {
    const file = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'app-icon.png'));
    const imageBuffer = yield resize(file, {height: 100, width: 100});
    const tmpFile = tmp.tmpNameSync() + '.png';
    fs.writeFileSync(tmpFile, imageBuffer);
    const type = imageType(fs.readFileSync(tmpFile));
    assert(type.ext === 'png');
  });

  it('should resize a gif', function* resizeImage() {
    const file = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'kim.gif'));
    const imageBuffer = yield resize(file, {height: 100, width: 100});
    const tmpFile = tmp.tmpNameSync() + '.gif';
    fs.writeFileSync(tmpFile, imageBuffer);
    const type = imageType(fs.readFileSync(tmpFile));
    assert(type.ext === 'gif');
  });
});
