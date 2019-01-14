import co from 'co';
import kue from 'kue';
import Sentry from '@sentry/node';
import debuglog from 'debug';

const debug = debuglog('hostr:worker');

Sentry.config(process.env.SENTRY_DSN).install();

const queue = kue.createQueue({
  redis: process.env.REDIS_URL,
});

function store(data, done) {
  co(function* gen() { // eslint-disable-line no-loop-func

  }).catch((err) => {
    debug(err);
    Sentry.captureException(err);
    return done();
  });
}

queue.process('store', 5, (job, done) => {
  store(job.data, done);
});


kue.app.listen(3000);
