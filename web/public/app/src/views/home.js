import React from 'react';
import { State, Link } from 'react-router';
import { connect } from 'react-redux';
import cookies from 'cookie-dough';

class Home extends React.Component {

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
      </div>
    );
  }
}

class File extends React.Component {
  render() {
    return (
      <div>
        <img src={this.props.direct['150x']} />
        <Link to='file' params={{id: this.props.id}}>{this.props.name}</Link>
      </div>
    );
  }
}

const Files = React.createClass({
  mixins: [ State ],
  logout(e) {
    e.preventDefault();
    cookies().remove('token');
    location.reload();
  },
  render() {
    return (
      <div>
        {this.props.user.email} <a href='/logout' onClick={this.logout}>Logout</a>
        <ul>
        {this.props.files.map((item, i) => {
          return (<File {...item} key={i} />);
        })}
        </ul>
      </div>
    );
  },
});


const Index = React.createClass({
  mixins: [ State ],
  render() {
    if (!this.props.user) {
      return <Home {...this.props} />;
    }
    return <Files {...this.props} />;
  },
});

function select(state) {
  return {
    user: state.user,
    token: state.token,
    files: state.files,
  };
}

export default connect(select)(Index);
