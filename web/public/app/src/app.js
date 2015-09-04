import React from 'react';
import { createStore } from 'redux';
import { Provider } from 'react-redux';
import Router from 'react-router';
import { routes } from './containers/App';
import reducers from './reducers';

if (typeof window !== 'undefined') {
  const store = createStore(reducers, window.STATE);
  console.info('Time since page started rendering: ' + (Date.now() - timerStart) + 'ms'); // eslint-disable-line no-console
  Router.run(routes, Router.HistoryLocation, (Handler, routerState) => {
    React.render(
      <Provider store={store}>
        {() => <Handler routerState={routerState} />}
      </Provider>,
      document
    );
  });
  ga('create', 'UA-66209-8', 'auto');
  ga('send', 'pageview');
}

export default { routes };
