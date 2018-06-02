const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
  entry: './web/public/src/app.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'web', 'public', 'build')
  },
  plugins: [
    new CopyWebpackPlugin([{ from: './web/public/src/partials', to: 'partials' }])
  ]
};