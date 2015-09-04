import React, { PropTypes } from 'react';
import { Route, RouteHandler, DefaultRoute, NotFoundRoute } from 'react-router';
import { connect } from 'react-redux';
import { Initializer as GAInitiailizer } from 'react-google-analytics';
import Head from '../views/head';
import NotFound from '../views/notfound';
import Home from '../views/home';
import Signin from '../views/signin';
import Signup from '../views/signup';
import File from '../views/file';

class App extends React.Component {
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

const filePropType = PropTypes.shape({
  added: PropTypes.string.isRequired,
  readableAdded: PropTypes.string.isRequired,
  downloads: PropTypes.number.isRequired,
  href: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  size: PropTypes.number.isRequired,
  readableSize: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  trashed: PropTypes.bool.isRequired,
  status: PropTypes.string.isRequired,
  height: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  direct: PropTypes.shape({
    '150x': PropTypes.string.isRequired,
    '970x': PropTypes.string.isRequired,
  }),
});

App.propTypes = {
  user: PropTypes.object,
  file: filePropType,
  files: PropTypes.arrayOf(filePropType),
  uploads: PropTypes.arrayOf(filePropType),
};

function select(state) {
  return {
    user: state.user,
    file: state.file,
    files: state.files,
    uploads: state.uploads,
  };
}

const connectedApp = connect(select)(App);

export default connectedApp;

const routes = [
  <Route name='home' handler={connectedApp} path='/'>
    <DefaultRoute handler={Home} />
    <NotFoundRoute handler={NotFound} />
    <Route name='signin' path='/signin' handler={Signin} />
    <Route name='signup' path='/signup' handler={Signup} />
    <Route name='file' path='/:id' handler={File} />
  </Route>,
];

export { routes };
