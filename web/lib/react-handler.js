import React from 'react';
import { createStore } from 'redux';
import { Provider } from 'react-redux';
import Router from 'react-router';
import reducers from '../public/app/src/reducers';

export function* createRouteHandler(routes, url) {
  const router = Router.create({
    location: url,
    routes: routes,
    onAbort(aborted) {
      const { to, params, query } = aborted;

      this.redirect(Router.makePath(to, params, query));
    },
  });

  return new Promise((resolve) => {
    router.run((Handler, routerState) => {
      resolve({ Handler, routerState });
    });
  });
}

export function* renderPage(routes, url, store = createStore(reducers)) {
  const { Handler, routerState } = yield createRouteHandler(routes, url);
  const content = React.renderToString(
    <Provider store={store}>
      {() => <Handler routerState={routerState} />}
    </Provider>
  );
  const built = process.env.NODE_ENV === 'production' ? `<script src='/app/build.js'></script>` : '';
  return '<!doctype html>\n' + content.replace('</body></html>', `<script>window.STATE = ${JSON.stringify(store.getState())}</script>
  <script src='/app/jspm_packages/system.js'></script>
  <script src='/app/config.js'></script>
  ${built}
  <script>System.import('app')</script>
</body></html>`);
}
