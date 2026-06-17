'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.config', 'tonton');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

function read() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function write(config) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
}

function isMuted() {
  return read().muted === true;
}

function setMuted(muted) {
  const config = read();
  config.muted = muted;
  write(config);
}

module.exports = { isMuted, setMuted, read, write, CONFIG_PATH };
