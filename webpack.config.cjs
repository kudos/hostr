const path = require('path');

module.exports = {
  devtool: 'source-map',
  entry: './web/public/src/index.jsx',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'web', 'public', 'build'),
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
      {
        test: /\.m?js$/,
        include: /node_modules/,
        resolve: { fullySpecified: false },
      },
    ],
  },
};
