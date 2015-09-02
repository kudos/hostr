import React from 'react';

export default class ErrorPage extends React.Component {
  render() {
    return (
      <div className='error'>
        <div className='container main'>
          <div className='row'>
            <div className='col-md-12'>
              <div className='error-logo'>
                <Link to='home'><img src='/images/logo-full-300.png' width='50' /></Link>
              </div>
            </div>
          </div>
          <div className='row vertical-center'>
            <div className='col-md-12'>
              <h2>404</h2>
              <h1>Sorry, it looks like the page you asked for is gone.</h1>
              <Link to='home'>Take Me Home</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
