import React from 'react';
import { Link, Navigation } from 'react-router';
import { connect } from 'react-redux';
import * as api from '../lib/api';
import co from 'co';
import { setToken, setUser, setFiles } from '../actions';

const Signin = React.createClass({
  mixins: [ Navigation ],
  getInitialState() {
    return {
      submitable: false,
      error: {},
    };
  },
  componentDidMount() {
    this.setState({
      submitable: true,
      error: this.state.error,
    });
  },
  onSubmit(e) {
    e.preventDefault();
    const email = this.refs.email.value;
    const password = this.refs.password.value;
    const terms = this.refs.terms.checked;
    co(function* wrap() {
      try {
        yield api.createUser(email, password, terms);
        let response = yield api.getToken(email, password);
        this.props.dispatch(setToken(response.body.token));
        response = yield api.getUser();
        this.props.dispatch(setUser(response.body));
        response = yield api.getFiles();
        this.props.dispatch(setFiles(response.body));
        this.props.history.pushState(null, '/');
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
                  <div className='form-group'>
                    <label htmlFor='inputEmail'>Password &mdash; <a href='/forgot' className='forgot'>Forgot it?</a></label>
                    <input ref='password' type='password' name='password' className='form-control form-control-lg' id='inputPassword' placeholder='Password' tabIndex='2' />
                  </div>
                  <div className='checkbox'>
                    <label>
                      <input ref='terms' type='checkbox' name='terms' tabIndex='3' />I agree to the Terms of Service.
                    </label>
                  </div>
                  <button type='submit' className='btn btn-block btn-primary btn-lg' tabIndex='4' disabled={!this.state.submitable}>Sign up</button>
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

export default connect(select)(Signin);
