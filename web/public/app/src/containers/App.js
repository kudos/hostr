import React, { PropTypes } from 'react';
import { Route, IndexRoute, Navigation } from 'react-router';
import { connect } from 'react-redux';
import { Initializer as GAInitiailizer } from 'react-google-analytics';
import co from 'co';
import cookies from 'cookie-dough';
import Dropzone from 'react-dropzone';
import * as api from '../lib/api';
import { setUser, setFiles, setStack } from '../actions';
import Head from '../views/head';
import NotFound from '../views/notfound';
import Index from '../views/index';
import Signin from '../views/signin';
import Signup from '../views/signup';
import Forgot from '../views/forgot';
import Stack from '../views/stack';
import File from '../views/file';

const App = React.createClass({
  mixins: [ Navigation ],

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
  },

  onDrop(files) {
    co(function* wrap() {
      const response = yield api.createStack();
      const stack = response.body;
      stack.files = files;
      this.props.dispatch(setStack(stack));
      this.props.history.pushState(null, `/${stack.id}`);
      // this.props.dispatch(uploadFile(file));
      // try {
      //   const response = yield api.uploadFile(file, (evt) => {
      //     file.percent = evt.percent;
      //     file.loaded = evt.loaded;
      //     this.props.dispatch(setUploadFileProgress(file));
      //   });
      //   this.props.dispatch(removeUploadFile(0));
      //   this.props.dispatch(addFile(response.body));
      // } catch (err) {
      //   console.error(err);
      // }
    }.bind(this)).catch((err) => {
      console.error(err);
    });
  },

  render() {
    return (
      <html>
        <Head {...this.props} />
        <body>
          <Dropzone ref='dropzone' onDrop={this.onDrop} disableClick={true} multiple={true} className='dropzone' activeClassName='dropzone-over'>
            {this.props.children}
          </Dropzone>
          <GAInitiailizer />
        </body>
      </html>
    );
  },
});

const filePropType = PropTypes.shape({
  downloads: PropTypes.number.isRequired,
  href: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  size: PropTypes.number.isRequired,
  type: PropTypes.string.isRequired,
  status: PropTypes.string.isRequired,
  direct: PropTypes.shape({
    thumb: PropTypes.string.isRequired,
    medium: PropTypes.string.isRequired,
    full: PropTypes.string.isRequired,
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
    stack: state.stack,
    stacks: state.stacks,
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
  <Route path='/:id' component={Stack} />
  <Route path='/:stackId/:id' component={File} />
  <Route path='*' component={NotFound} />
</Route>;

export { routes };
