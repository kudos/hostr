const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  devtool: "source-map",
  entry: "./web/public/src/app.js",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "web", "public", "build"),
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        resolve: { fullySpecified: false },
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: "./web/public/src/partials", to: "partials" }],
    }),
  ],
};
