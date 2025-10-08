import co from "co";
import kue from "kue";
import debuglog from "debug";

const debug = debuglog("hostr:worker");

const queue = kue.createQueue({
  redis: process.env.REDIS_URL,
});

function store(data, done) {
  co(function* gen() {
    // eslint-disable-line no-loop-func
  }).catch((err) => {
    debug(err);
    return done();
  });
}

queue.process("store", 5, (job, done) => {
  store(job.data, done);
});

kue.app.listen(3000);
