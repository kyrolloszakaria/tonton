'use strict';

const { resolveSound, listSounds, generateWav } = require('./sounds');
const { playSound } = require('./player');
const { isMuted } = require('./config');

async function play(options = {}) {
  const { sound = 'default', volume } = options;

  if (isMuted()) return;

  try {
    const soundInfo = resolveSound(sound);
    await playSound(soundInfo, { volume });
  } catch {
    // Never throw — a notification sound failing is not an error
    try { process.stdout.write('\x07'); } catch {}
  }
}

module.exports = { play, listSounds, generateWav };
