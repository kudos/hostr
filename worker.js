import co from 'co';
import kue from 'kue';
import raven from 'raven';
import debuglog from 'debug';

import models from '../models';

const debug = debuglog('hostr:worker');

raven.config(process.env.SENTRY_DSN).install();

const queue = kue.createQueue({
  redis: process.env.REDIS_URL,
});

function store(data, done) {
  co(function* gen() { // eslint-disable-line no-loop-func

  }).catch((err) => {
    debug(err);
    raven.captureException(err);
    return done();
  });
}

queue.process('store', 5, (job, done) => {
  store(job.data, done);
});


kue.app.listen(3000);
