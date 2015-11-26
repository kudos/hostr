import React from 'react';
import { connect } from 'react-redux';
import Home from './home';
import Stacks from './stacks';

const Index = React.createClass({
  render() {
    if (!this.props.user) {
      return <Home {...this.props} />;
    }
    return <Stacks {...this.props} />;
  },
});

function select(state) {
  return {
    user: state.user,
    token: state.token,
    files: state.files,
    stacks: state.stacks,
    stack: state.stack,
  };
}

export default connect(select)(Index);
