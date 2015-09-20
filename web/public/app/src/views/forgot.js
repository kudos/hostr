import React from 'react';
import { Link, Navigation } from 'react-router';
import { connect } from 'react-redux';
import * as api from '../lib/api';
import co from 'co';
import { requestReset } from '../actions';

const Forgot = React.createClass({
  mixins: [ Navigation ],
  getInitialState() {
    return {
      submitable: false,
      error: {},
      message: '',
    };
  },
  componentDidMount() {
    this.setState({
      submitable: true,
      error: this.state.error,
      message: '',
    });
  },
  onSubmit(e) {
    e.preventDefault();
    const email = this.refs.email.value;
    co(function* wrap() {
      try {
        let response = yield api.requestReset(email);
        this.setState({submitable: true, error: {}, message: 'A password reset email has been sent. Please ensure you check your spam folder.'});
      } catch (err) {
        if (err.response && err.response.body) {
          this.setState({error: err.response.body.error});
        } else {
          this.setState({error: {message: 'Something went wrong :('}});
        }
      }
    }.bind(this));
  },
  render() {
    return (
      <div className='home'>
        <div className='header-gradient'>
          <header className='container'>
            <div className='row vertical-center'>
              <div className='col-lg-5 col-lg-offset-1'>
                <div className='name'>
                  <h1><Link to='/'><img src='/images/logo.png' height='40rem' className='logo' /> hostr</Link></h1>
                  <p className='tagline'>
                    Instant Sharing
                  </p>
                </div>
              </div>
              <div className='col-lg-5'>
                <form role='form' onSubmit={this.onSubmit}>
                  <div className='form-group'>
                    <label htmlFor='inputEmail'>Email</label> {(this.state.error ? this.state.error.message : '')}
                    <input ref='email' type='email' name='email' className='form-control form-control-lg' id='inputEmail' placeholder='Enter email' tabIndex='1' />
                  </div>
                  <button type='submit' className='btn btn-block btn-primary btn-lg' tabIndex='4' disabled={!this.state.submitable}>Submit</button>
                </form>
              </div>
            </div>
          </header>
        </div>
      </div>
    );
  },
});

function select(state) {
  return {
    user: state.user,
    token: state.token,
  };
}

export default connect(select)(Forgot);
