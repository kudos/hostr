import debugname from 'debug';
const debug = debugname('hostr-api:resize');
import gm from 'gm';
import Canvas from 'canvas';
import smartcrop from 'smartcrop';

function canvasFactory(width, height) {
  return new Canvas(width, height);
}

export default function(input, size) {
  debug('Resizing');
  const img = new Canvas.Image();
  img.src = input;
  smartcrop.crop(img, {...size, canvasFactory}, (result) => {
    console.dir(result);
  });

  // const image = gm(input);

  // return image.resize(size.width, size.height, '>').stream();
}
