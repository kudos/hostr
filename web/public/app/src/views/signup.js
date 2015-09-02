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
                <form role='form' action='/signup' method='post'>
                  <div className='form-group'>
                    <label htmlFor='inputEmail'>Email</label>
                    <input type='email' name='email' className='form-control form-control-lg' id='inputEmail' placeholder='Email' tabIndex='1' />
                  </div>
                  <div className='form-group'>
                    <label htmlFor='inputEmail'>Email Again</label>
                    <input type='email-again' name='email-again' className='form-control form-control-lg' id='inputEmailAgain' placeholder='Email Again' tabIndex='1' />
                  </div>
                  <div className='form-group'>
                    <label htmlFor='inputEmail'>Password</label>
                    <input type='password' name='password' className='form-control form-control-lg' id='inputPassword' placeholder='Password' tabIndex='2' />
                  </div>
                  <div className='checkbox'>
                    <label>
                      <input type='checkbox' name='remember' tabIndex='3' />I agree to the <a href='/terms' target='_blank'>terms of service</a>.
                    </label>
                  </div>
                  <button type='submit' className='btn btn-block btn-primary btn-lg' tabIndex='4'>Sign up</button>
                </form>
              </div>
            </div>
          </header>
        </div>
      </div>
    );
  },
});
