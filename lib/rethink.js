import rethinkdbdash from 'rethinkdbdash';

export const db = rethinkdbdash({db: 'hostr', silent: true});

export default function() {
  return function* dbMiddleware(next) {
    this.rethink = db;
    yield next;
  };
}
