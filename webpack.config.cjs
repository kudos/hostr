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
        use: {
          loader: 'esbuild-loader',
          options: {
            loader: 'jsx',
            jsx: 'automatic',
            target: 'es2020',
          },
        },
      },
      {
        test: /\.m?js$/,
        include: /node_modules/,
        resolve: { fullySpecified: false },
      },
    ],
  },
};
