import React from 'react';
import { State } from 'react-router';
import { connect } from 'react-redux';
import Home from './home';
import Files from './files';

const Index = React.createClass({
  mixins: [ State ],
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
