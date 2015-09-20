import React from 'react';
import { IndexLink } from 'react-router';

export default React.createClass({
  render() {
    return (
      <div className='error header-gradient'>
        <div className='container'>
          <div className='row'>
            <div className='col-md-12'>
              <div className='error-logo'>
                <Link to='/'><img src='/images/logo.png' height='30rem' className='logo' /></Link>
              </div>
            </div>
          </div>
          <div className='row vertical-center'>
            <div className='col-md-12'>
              <h2>404</h2>
              <h1>Sorry, it looks like the file you asked for is gone.</h1>
              <Link to='/'>Take Me Home</Link>
            </div>
          </div>
        </div>
      </div>
    );
  },
});
