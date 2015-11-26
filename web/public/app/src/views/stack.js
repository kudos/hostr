import React from 'react';
import { State, Link } from 'react-router';
import { connect } from 'react-redux';
import co from 'co';
import * as api from '../lib/api';
import { setStack } from '../actions';

class Thumbnail extends React.Component {
  render() {
    if (this.props.direct || this.props.thumbnail) {
      const imgUrl = this.props.thumbnail || this.props.direct.medium;
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

class FileReact extends React.Component { // don't clobber native File class
  render() {
    return (
      <div className='col-xs-12 col-sm-6 col-md-6 col-lg-4 item'>
        <Link to={`/${this.props.id}`} title={this.props.name}>
          <Thumbnail {...this.props} />
        </Link>
        <div className='name'>
          <Link to={`/${this.props.id}`} title={this.props.name}>{this.props.name}</Link>
        </div>
      </div>
    );
  }
}

class DroppedFile extends React.Component {
  render() {
    return (
      <div className='col-xs-12 col-sm-6 col-md-6 col-lg-4 item'>
        <Link to={`/${this.props.file.id}`} title={this.props.file.name}>
          <Thumbnail {...this.props} />
        </Link>
        <div className='name'>
          <Link to={`/${this.props.file.id}`} title={this.props.file.name}>{this.props.file.name}</Link>
        </div>
      </div>
    );
  }
}

const Stack = React.createClass({
  mixins: [ State ],
  getInitialState() {
    if (this.props.stack && this.props.params.id === this.props.stack.id) {
      return {stack: this.props.stack};
    }
    return {stack: {id: '', name: '', files: []}};
  },
  componentDidMount() {
    if (!this.state.stack.id) {
      api.getStack(this.props.params.id).then((res) => {
        this.props.dispatch(setStack(res.body));
      });
    }
    this.state.stack.files.forEach((file) => {
      co(function* wrap() {
        if (file instanceof File) {
          const response = yield api.uploadFile(file, this.state.stack.id, (ab, ba) => {
            console.dir(ab);
            console.dir(ba);
          });
          console.dir(response);
        }
      }.bind(this));
    });
  },
  render() {
    if (!this.props.stack || this.props.params.id !== this.props.stack.id) {
      return (<div/>);
    }
    return (
      <div className='container'>
        <div className='files'>
          <header className='clearfix'>
            <Link to='/' className='pull-left'>
              <img src='/images/logo.png' height='30rem' className='logo' />
            </Link>
          </header>

          <div className='row'>
          {this.state.stack.files.map((file, idx) => {
            if (file.name) {
              return (<FileReact {...file} key={idx} />);
            }
            return (<DroppedFile file={file} key={idx} />);
          })}
          </div>
        </div>
      </div>
    );
  },
});

function select(state) {
  return {
    stack: state.stack,
  };
}

export default connect(select)(Stack);
