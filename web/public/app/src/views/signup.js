import React from 'react';
import { Navigation, State, Link } from 'react-router';

export default React.createClass({
  mixins: [ Navigation, State ],
  render() {
    return (
      <div className='signinup'>
        <header>
          <Link to='home'><img src='/images/logo.png' width='50px' className='logo' /></Link>
        </header>
        <div className='container'>
          <div className='row vertical-center'>
            <div className='col-lg-4 col-lg-offset-4'>
              <form role='form' action='/signup' method='post'>
                <div className='form-group'>
                  <label for='inputEmail'>Email</label>
                  <input type='email' name='email' className='form-control form-control-lg' id='inputEmail' placeholder='Enter Email' tabindex='1' />
                </div>
                <div className='form-group'>
                  <label for='inputEmail'>Email Again</label>
                  <input type='email-again' name='email-again' className='form-control form-control-lg' id='inputEmailAgain' placeholder='Enter Email Again' tabindex='1' />
                </div>
                <div className='form-group'>
                  <label for='inputEmail'>Password</label>
                  <input type='password' name='password' className='form-control form-control-lg' id='inputPassword' placeholder='Password' tabindex='2' />
                </div>
                <div className='checkbox'>
                  <label>
                    <input type='checkbox' name='remember' tabindex='3' />Remember me on this computer.
                  </label>
                </div>
                <button type='submit' className='btn btn-block btn-primary btn-lg' tabindex='4'>Sign in</button>
              </form>
            </div>
          </div>
        </div>
        <div className='container'>
          <section className='row'>

          </section>

          <footer className='row'>

          </footer>
        </div>
      </div>
    );
  },
});
