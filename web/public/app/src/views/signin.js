import React from 'react';
import { State, Link } from 'react-router';

export default React.createClass({
  mixins: [ State ],
  render() {
    return (
      <div className='home'>
        <div className='header-gradient'>
          <header className='container'>
            <div className='row vertical-center'>
              <div className='col-lg-5 col-lg-offset-1'>
                <div className='name'>
                  <h1><Link to='home'><img src='/images/logo.png' height='40rem' className='logo' /> hostr</Link></h1>
                  <p className='tagline'>
                    Instant Sharing
                  </p>
                </div>
              </div>
              <div className='col-lg-5'>
                <form role='form' action='/signin' method='post'>
                  <div className='form-group'>
                    <label htmlFor='inputEmail'>Email</label>
                    <input type='email' name='email' className='form-control form-control-lg' id='inputEmail' placeholder='Enter email' tabIndex='1' />
                  </div>
                  <div className='form-group'>
                    <label htmlFor='inputEmail'>Password &mdash; <a href='/forgot' className='forgot'>Forgot it?</a></label>
                    <input type='password' name='password' className='form-control form-control-lg' id='inputPassword' placeholder='Password' tabIndex='2' />
                  </div>
                  <div className='checkbox'>
                    <label>
                      <input type='checkbox' name='remember' tabIndex='3' />Remember me on this computer.
                    </label>
                  </div>
                  <button type='submit' className='btn btn-block btn-primary btn-lg' tabIndex='4'>Sign in</button>
                </form>
              </div>
            </div>
          </header>
        </div>
      </div>
    );
  },
});
