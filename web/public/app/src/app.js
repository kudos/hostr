import React from 'react';
import Router, { Route, RouteHandler, DefaultRoute, NotFoundRoute } from 'react-router';
import { Initializer as GAInitiailizer } from 'react-google-analytics';
import Head from './views/head';
import Home from './views/home';
import Signin from './views/signin';
import Signup from './views/signup';
import NotFound from './views/notfound';

export default class App extends React.Component {
  render() {
    return (
      <html>
        <Head {...this.props} />
        <body>
          <RouteHandler {...this.props} />
          <GAInitiailizer />
          <script src='/app/jspm_packages/system.js'></script>
          <script src='/app/config.js'></script>
          <script dangerouslySetInnerHTML={{__html: 'System.import(\'app\');'}}></script>
        </body>
      </html>
    );
  }
}

const routes = [
  <Route name='home' handler={App} path='/'>
    <DefaultRoute handler={Home} />
    <NotFoundRoute handler={NotFound}/>
    <Route name='signin' path='/signin' handler={Signin} />
    <Route name='signup' path='/signup' handler={Signup} />
  </Route>,
];

if (typeof window !== 'undefined') {
  console.info('Time since page started rendering: ' + (Date.now() - timerStart) + 'ms'); // eslint-disable-line no-console
  Router.run(routes, Router.HistoryLocation, (Handler) => {
    React.render(<Handler />, document);
  });
  ga('create', 'UA-66209-8', 'auto');
  ga('send', 'pageview');
}

export { routes };
