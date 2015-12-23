import 'babel-polyfill';
import React from 'react';
import ReactDOM from 'react-dom';
import { createStore } from 'redux';
import { Provider } from 'react-redux';
import { Router } from 'react-router';
import createBrowserHistory from 'history/lib/createBrowserHistory';
import { routes } from './containers/App';
import reducers from './reducers';

if (typeof window !== 'undefined') {
  const store = createStore(reducers, window.STATE);
  console.info('Time since page started rendering: ' + (Date.now() - timerStart) + 'ms'); // eslint-disable-line
  ReactDOM.render(
    <Provider store={store}>
      <Router history={createBrowserHistory()}>{routes}</Router>
    </Provider>,
    document
  );
  ga('create', 'UA-66209-8', 'auto'); // eslint-disable-line no-undef
  ga('send', 'pageview'); // eslint-disable-line no-undef
}

export { routes };
