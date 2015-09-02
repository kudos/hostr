import React from 'react';

export default class Head extends React.Component {
  render() {
    return (
      <head>
        <script dangerouslySetInnerHTML={{__html: 'var timerStart = Date.now();'}}></script>
        <meta charSet='utf-8' />
        <meta httpEquiv='X-UA-Compatible' content='IE=edge' />
      </head>
    );
  }
}
