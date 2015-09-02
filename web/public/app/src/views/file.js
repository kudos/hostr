import React from 'react';
import { State, Link } from 'react-router';

export default React.createClass({
  mixins: [ State ],
  render() {

    return (
      <div>
        FILE OMG <Link to='home'>HOME</Link>
      </div>
    );
  },
});
