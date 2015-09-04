import React from 'react';
import { State, Link } from 'react-router';
import { connect } from 'react-redux';
import request from 'superagent';
import { setFile } from '../actions';

const File = React.createClass({
  mixins: [ State ],
  getInitialState() {
    if (this.props.file && this.getParams().id === this.props.file.id) {
      return {file: this.props.file};
    }
    return {file: {id: '', name: '', 'direct': {'970x': ''}}};
  },
  componentDidMount() {
    if (!this.state.file.id) {
      request.get('/api/file/' + this.getParams().id).then((res) => {
        this.props.dispatch(setFile(res.body));
      });
    }
  },
  render() {
    if (!this.props.file || this.getParams().id !== this.props.file.id) {
      return (<div/>);
    }
    const file = this.props.file;
    return (
      <div className='container'>
        <div className='row'>
          <div className='col-lg-12'>
            <div className='logo'>
              <Link to='home'><img src='/images/logo.png' height='30rem' className='logo' /></Link>
            </div>
          </div>
        </div>
        <div className='row'>
          <div className='col-lg-12 text-center'>
            <h1>{file.name}</h1>
            <img src={file.direct['970x']} />
          </div>
        </div>
      </div>
    );
  },
});

function select(state) {
  return {
    file: state.file,
  };
}

export default connect(select)(File);
