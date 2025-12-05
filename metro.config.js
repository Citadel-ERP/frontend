const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Block Firebase packages from being bundled
config.resolver.blockList = [
  /firebase/,
  /@react-native-firebase/,
  /google-services\.json/,
];

module.exports = config;