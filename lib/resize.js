import debugname from 'debug';
const debug = debugname('hostr-api:resize');
import gm from 'gm';

export default function(input, size) {
  debug('Resizing');
  const image = gm(input);

  return image.resize(size.width, size.height, '>').stream();
}
