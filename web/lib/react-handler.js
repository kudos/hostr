import React from 'react';
import { renderToString } from 'react-dom/server';
import { createStore } from 'redux';
import { Provider } from 'react-redux';
import { RoutingContext, match } from 'react-router';
import createLocation from 'history/lib/createLocation';
import reducers from '../public/app/src/reducers';

export function matchRoute(routes, url) {
  const location = createLocation(url);
  return new Promise((resolve, reject) => {
    match({ routes, location }, (error, redirectLocation, renderProps) => {
      resolve({error, redirectLocation, renderProps});
    });
  });
}

export function* renderPage(routes, url, store = createStore(reducers)) {
  const { error, redirectLocation, renderProps } = yield matchRoute(routes, url);

  if (error) {
    throw new Error(error.message);
  } else if (redirectLocation) {
    return redirectLocation.pathname + redirectLocation.search;
  } else if (renderProps === null) {
    return false;
  }

  const content = renderToString(<Provider store={store}>
    <RoutingContext {...renderProps} />
  </Provider>);

  const built = process.env.NODE_ENV === 'production' ? `<script src='/app/build/app-bundle.js'></script>` : `<script>
    System.paths["views/*"] = "build/src/*";
    System.paths["app"] = "build/app";
  </script>`;
  return '<!doctype html>\n' + content.replace('</body></html>', `<script>window.STATE = ${JSON.stringify(store.getState())}</script>
  <script src='/app/jspm_packages/system.js'></script>
  <script src='/app/config.js'></script>
  ${built}
  <script>System.import('babel/external-helpers')</script>
  <script>System.import('app')</script>
</body></html>`);
}
