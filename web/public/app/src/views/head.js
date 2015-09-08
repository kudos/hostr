import React from 'react';

export default class Head extends React.Component {
  render() {
    return (
      <head>
        <script dangerouslySetInnerHTML={{__html: 'var timerStart = Date.now();'}}></script>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1.0' />
        <meta httpEquiv='x-ua-compatible' content='ie=edge' />
        <title>Hostr &mdash; Instant Sharing</title>
        <meta content='Hostr' property='og:site_name' />
        <meta content='Instant Sharing' property='og:title' />
        <meta content='https://hostr.co' property='og:url' />
        <meta name='description' content='Share anything instantly. From screenshots to zip files to anything else, for free!' property='og:description' />

        <link rel="icon" type="image/png" href="/images/favicon-32x32.png" sizes="32x32" />
        <link href='/app/build/css/style.css' rel='stylesheet' type='text/css' />
      </head>
    );
  }
}
