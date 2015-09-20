import React from 'react';
import { State, Link } from 'react-router';
import { connect } from 'react-redux';
import request from 'superagent';
import { setFile } from '../actions';

const Image = React.createClass({
  render() {
    return (
      <div className='image'>
        <header>
          <Link to='/' className='pull-right'><img src='/images/dots-three-horizontal.svg' height='30rem' className='logo' /></Link>
          <Link to='/' className='pull-left'><img src='/images/logo.png' height='30rem' className='logo' /></Link>
        <h1 className='text-center'>{this.props.file.name}</h1>
        </header>
        <div className='row'>
          <div className='col-lg-12'>
            <img src={this.props.file.direct['970x']} />
          </div>
        </div>
      </div>
    );
  },
});

const Download = React.createClass({
  render() {
    return (
      <div className='download'>
        <header>
          <Link to='/' className='pull-left'><img src='/images/logo.png' height='30rem' className='logo' /></Link>
        </header>
        <div className='row'>
          <div className='col-lg-12'>
            <h1 className='text-center'>{this.props.file.name}</h1>
            <a href={'/file/' + this.props.file.id + '/' + this.props.file.name + '?warning=on'} className='btn btn-primary btn-lg'>Download</a>
          </div>
        </div>
      </div>
    );
  },
});

const File = React.createClass({
  mixins: [ State ],
  getInitialState() {
    if (this.props.file && this.props.params.id === this.props.file.id) {
      return {file: this.props.file};
    }
    return {file: {id: '', name: '', 'direct': {'970x': ''}}};
  },
  componentDidMount() {
    if (!this.state.file.id) {
      request.get('/api/file/' + this.props.params.id).then((res) => {
        this.props.dispatch(setFile(res.body));
      });
    }
  },
  render() {
    if (!this.props.file || this.props.params.id !== this.props.file.id) {
      return (<div/>);
    }

    if (this.props.file.direct) {
      return <Image {...this.props} />;
    }
    return <Download {...this.props} />;
  },
});

function select(state) {
  return {
    file: state.file,
  };
}

export default connect(select)(File);
