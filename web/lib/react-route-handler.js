import Router from 'react-router';

export default function* (routes, url) {
  const router = Router.create({
    location: url,
    routes: routes,
    onAbort(aborted) {
      const { to, params, query } = aborted;

      this.redirect(Router.makePath(to, params, query));
    },
  });

  return new Promise((resolve) => {
    router.run((Handler) => {
      resolve(Handler);
    });
  });
}
