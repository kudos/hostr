import React, { PropTypes } from 'react';
import { Route, IndexRoute } from 'react-router';
import { connect } from 'react-redux';
import { Initializer as GAInitiailizer } from 'react-google-analytics';
import co from 'co';
import cookies from 'cookie-dough';
import * as api from '../lib/api';
import { setUser, setFiles } from '../actions';
import Head from '../views/head';
import NotFound from '../views/notfound';
import Index from '../views/index';
import Signin from '../views/signin';
import Signup from '../views/signup';
import Forgot from '../views/forgot';
import File from '../views/file';

class App extends React.Component {
  componentDidMount() {
    const token = cookies().get('token');
    if (token) {
      co(function* wrap() {
        try {
          let response = yield api.getUser();
          this.props.dispatch(setUser(response.body));
          response = yield api.getFiles();
          this.props.dispatch(setFiles(response.body));
        } catch (error) {
          console.error(error);
          cookies().remove('token');
        }
      }.bind(this));
    }
  }
  render() {
    return (
      <html>
        <Head {...this.props} />
        <body>
          {this.props.children}
          <GAInitiailizer />
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
  direct: PropTypes.shape({
    '150x': PropTypes.string.isRequired,
    '970x': PropTypes.string.isRequired,
  }),
});

App.propTypes = {
  user: PropTypes.object,
  file: filePropType,
  files: PropTypes.arrayOf(filePropType),
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

const routes =
<Route path='/' component={connectedApp}>
  <IndexRoute component={Index} />
  <Route path='/signin' component={Signin} />
  <Route path='/signup' component={Signup} />
  <Route path='/forgot' component={Forgot} />
  <Route path='/forgot/:id' component={Forgot} />
  <Route path='/:id' component={File} />
  <Route path='*' component={NotFound} />
</Route>;

export { routes };