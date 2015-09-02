import React from 'react';
import { RouteHandler } from 'react-router';
import { Initializer as GAInitiailizer } from 'react-google-analytics';
import Head from './head';

export default class App extends React.Component {
  render() {
    return (
      <html>
        <Head {...this.props} />
        <body className='home'>
          <RouteHandler {...this.props} />
          <GAInitiailizer />
          <script src='/jspm_packages/system.src.js'></script>
          <script src='/config.js'></script>
        <script dangerouslySetInnerHTML={{__html: 'System.import(\'views/app\');'}}></script>
        </body>
      </html>
    );
  }
}
