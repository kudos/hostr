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
              <div className='col-lg-5 col-lg-offset-1 col-sm-12'>
                <div className='name'>
                  <h1><img src='/images/logo.png' height='40rem' className='logo' /> hostr</h1>
                  <p className='tagline'>
                    Instant Sharing
                  </p>
                </div>
              </div>
              <div className='col-lg-5 col-sm-12'>
                <p className='cta'>
                  <Link to='signup' className='btn btn-primary btn-lg'>Sign&nbsp;Up</Link>or&nbsp;<Link to='signin'>Sign&nbsp;In</Link>
                </p>
              </div>
            </div>
          </header>
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
