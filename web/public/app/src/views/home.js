import React from 'react';
import { State, Link } from 'react-router';

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
  render() {
    return (
      <div>
        <ul>
        {this.props.files.map((item, i) => {
          return (<File {...item} key={i} />);
        })}
        </ul>
      </div>
    );
  },
});


export default React.createClass({
  mixins: [ State ],
  render() {
    if (!this.props.user) {
      return <Home {...this.props} />;
    }
    return <Files {...this.props} />;
  },
});
