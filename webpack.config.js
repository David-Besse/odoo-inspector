const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const { version } = require('./package.json');

module.exports = {
  mode: 'production',
  entry: {
    'service-worker': './src/service-worker.js',
    popup: './src/popup.js',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/popup.html' },
        { from: 'src/img', to: 'img' },
        // La version du manifeste vient de package.json, seule source de vérité
        { from: 'manifest.json', transform: content => JSON.stringify({ ...JSON.parse(content), version }, null, 2) },
      ],
    }),
  ],
};
