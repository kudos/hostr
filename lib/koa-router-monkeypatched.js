import Router from 'koa-router';

import debuglog from 'debug';
const debug = debuglog('hostr:koa-router-monkeypatched');


Router.prototype.routes = Router.prototype.middleware = function () {
  var router = this;

  var dispatch = function *dispatch(next) {
    debug('%s %s', this.method, this.path);

    var path = router.opts.routerPath || this.routerPath || this.path;
    var matched = router.match(path, this.method);

    if (this.matched) {
      this.matched.push.apply(this.matched, matched.layers);
    } else {
      this.matched = matched.layers;
    }

    if (matched.route) {
      this.route = matched.route;
      this.captures = this.route.captures(path, this.captures);
      this.params = this.route.params(path, this.captures, this.params);

      debug('dispatch %s %s', this.route.path, this.route.regexp);

      next = matched.route.middleware.call(this, next);
    }

    if (matched.middleware) {
      for (var i = 0, l = matched.middleware.length; i < l; i++) {
        next = matched.middleware[i].call(this, next);
      }
    }

    yield *next;
  };

  dispatch.router = this;

  return dispatch;
};

export default Router;
