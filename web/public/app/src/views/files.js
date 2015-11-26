import React from 'react';
import { Link } from 'react-router';
import cookies from 'cookie-dough';

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

class File extends React.Component {
  render() {
    return (
      <div className='col-xs-6 col-sm-4 col-md-3 col-lg-2 item'>
        <Link to={`/${this.props.stackId}/${this.props.id}`} title={this.props.name}>
          <Thumbnail {...this.props} />
        </Link>
        <div className='name'>
          <Link to={`/${this.props.stackId}/${this.props.id}`} title={this.props.name}>{this.props.name}</Link>
        </div>
      </div>
    );
  }
}

export default React.createClass({
  logout(evt) {
    evt.preventDefault();
    cookies().remove('token');
    location.reload();
  },
  onSelectFile() {
    this.refs.dropzone.open();
  },
  render() {
    return (
      <div className='container'>
        <div className='files'>
          <header className='clearfix'>
            <Link to='/' className='pull-left'>
              <img src='/images/logo.png' height='30rem' className='logo' />
            </Link>
            <div className='pull-right'>
              <button type='button' onClick={this.onSelectFile} className='btn btn-sm btn-primary-outline'>
                Upload File
              </button>
              {this.props.user.email} <a href='/logout' onClick={this.logout}>Logout</a>
            </div>
          </header>

          <div className='row'>
          {this.props.files.map((item, idx) => {
            return (<File {...item} key={idx} />);
          })}
          </div>
        </div>
      </div>
    );
  },
});
