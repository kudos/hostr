import React from 'react';
import { State, Link } from 'react-router';
import { connect } from 'react-redux';
import cookies from 'cookie-dough';
import Dropzone from '../lib/react-dropzone';
import co from 'co';
import { addFile, uploadFile, setUploadFileProgress, removeUploadFile } from '../actions';
import * as api from '../lib/api';

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
    let thumbnail;
    if (this.props.direct) {
      thumbnail = <img src={this.props.direct['150x']} width='150' />;
    }
    return (
      <div>
        {thumbnail}
        <Link to='file' params={{id: this.props.id}}>{this.props.name}</Link>
      </div>
    );
  }
}

class Upload extends React.Component {
  render() {
    let thumbnail;
    if (this.props.thumbnail) {
      thumbnail = <img src={this.props.thumbnail} width='150' />;
    }
    return (
      <div>
        {thumbnail}
        {this.props.name} {this.props.percent}%
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
  onDrop(file) {
    co(function* wrap() {
      this.props.dispatch(uploadFile(file));
      try {
        const response = yield api.uploadFile(file, (evt) => {
          file.percent = evt.percent;
          file.loaded = evt.loaded;
          this.props.dispatch(setUploadFileProgress(file));
        });
        this.props.dispatch(removeUploadFile(0));
        this.props.dispatch(addFile(response.body));
      } catch(e) {
        console.error(e);
      }
    }.bind(this));
  },
  onSelectFile() {
    this.refs.dropzone.open();
  },
  render() {
    return (
      <Dropzone ref="dropzone" onDrop={this.onDrop} disableClick={true} multiple={false} className='dropzone' activeClassName='dropzone-over'>
        {this.props.user.email} <a href='/logout' onClick={this.logout}>Logout</a>
        <button type="button" onClick={this.onSelectFile} className='btn'>
          Upload File
        </button>
        <ul>
        {this.props.uploads.map((item, i) => {
          return (<Upload {...item} key={i} />);
        })}
        </ul>
        <ul>
        {this.props.files.map((item, i) => {
          return (<File {...item} key={i} />);
        })}
        </ul>
      </Dropzone>
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
    uploads: state.uploads,
  };
}

export default connect(select)(Index);
