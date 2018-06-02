
/**
 * Module dependencies.
 */

const Stats = require('statsy');

/**
 * Initialize stats middleware with `opts`
 * which are passed to statsy.
 *
 * @param {Object} [opts]
 * @return {Function}
 * @api public
 */

export default function (opts) {
  const s = new Stats(opts || {});

  return async (ctx, next) => {
    // counters
    s.incr('request.count');
    s.incr(`request.${ctx.method}.count`);

    // size
    s.histogram('request.size', ctx.request.length || 0);

    // remote addr
    // s.set('request.addresses', this.ip);

    // duration
    ctx.res.on('finish', s.timer('request.duration'));

    await next();
  };
}
