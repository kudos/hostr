import React from 'react';
import { Link } from 'react-router';
import cookies from 'cookie-dough';
import Dropzone from '../lib/react-dropzone';
import co from 'co';
import { addFile, uploadFile, setUploadFileProgress, removeUploadFile } from '../actions';
import * as api from '../lib/api';

class Thumbnail extends React.Component {
  render() {
    if (this.props.direct || this.props.thumbnail) {
      const imgUrl = this.props.thumbnail || this.props.direct['150x'];
      return (
        <div className='thumbnail'>
          <img src={imgUrl} width='100%' className={(this.props.height / this.props.width > (3 / 5) ) ? 'portrait' : ''} />
        </div>
      );
    }
    return (
      <div className='icon'>
        <img src='/images/file.png' />
      </div>
    );
  }
}

class Upload extends React.Component {
  render() {
    return (
      <div className='col-xs-6 col-sm-4 col-md-3 col-lg-2 item'>
        <Thumbnail {...this.props} />
        <div style={{float: 'right'}}>{this.props.percent}</div>
        <div className='name'>
          {this.props.name}
        </div>
      </div>
    );
  }
}

class File extends React.Component {
  render() {
    return (
      <div className='col-xs-6 col-sm-4 col-md-3 col-lg-2 item'>
        <Link to='file' params={{id: this.props.id}} title={this.props.name}>
          <Thumbnail {...this.props} />
        </Link>
        <div className='name'>
          <Link to='file' params={{id: this.props.id}} title={this.props.name}>{this.props.name}</Link>
        </div>
      </div>
    );
  }
}

export default React.createClass({
  logout(e) {
    e.preventDefault();
    cookies().remove('token');
    location.reload();
  },
  onDrop(file) {
    co(function* wrap() {
      console.log(this);
      console.log(this.props);
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
        <div className='container'>
          <div className='files'>
            <header className='clearfix'>
              <Link to='home' className='pull-left'>
                <img src='/images/logo.png' height='30rem' className='logo' />
              </Link>
              <div className='pull-right'>
                <button type="button" onClick={this.onSelectFile} className='btn btn-sm btn-primary-outline'>
                  Upload File
                </button>
                {this.props.user.email} <a href='/logout' onClick={this.logout}>Logout</a>
              </div>
            </header>

            <div className='row'>
            {this.props.uploads.map((item, i) => {
              return (<Upload {...item} key={i} />);
            })}
            </div>

            <div className='row'>
            {this.props.files.map((item, i) => {
              return (<File {...item} key={i} />);
            })}
            </div>
          </div>
        </div>
      </Dropzone>
    );
  },
});
