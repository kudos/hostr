import React from 'react';
import { connect } from 'react-redux';
import Home from './home';
import Files from './files';

const Index = React.createClass({
  render() {
    if (!this.props.user) {
      return <Home {...this.props} />;
    }
    return <Files {...this.props} />;
  },
});

function select(state) {
  return {
    user: state.user,
    token: state.token,
    files: state.files,
    uploads: state.uploads,
  };
}

export default connect(select)(Index);
