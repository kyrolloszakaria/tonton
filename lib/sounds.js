'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const MACOS_SOUNDS_DIR = '/System/Library/Sounds';
const FREEDESKTOP_DIRS = [
  '/usr/share/sounds/freedesktop/stereo',
  '/usr/share/sounds/gnome/default/alerts',
  '/usr/share/sounds/ubuntu/stereo',
];
const WINDOWS_SOUNDS_DIR = 'C:\\Windows\\Media';

// Presets: distinct sounds for different events
const PRESETS = {
  done: {
    // Descending two-tone: satisfying "complete" feel
    macos: 'Glass',
    synth: { tones: [{ freq: 880, start: 0 }, { freq: 660, start: 0.15 }], duration: 0.35 },
  },
  input: {
    // Ascending two-tone: questioning "hey, look here" feel
    macos: 'Funk',
    synth: { tones: [{ freq: 440, start: 0 }, { freq: 880, start: 0.12 }], duration: 0.4 },
  },
};

function generateWav(options = {}) {
  const {
    frequency = 880,
    frequency2 = 1320,
    duration = 0.3,
    sampleRate = 8000,
    volume = 0.8,
    tones = null,
  } = options;

  const numSamples = Math.floor(sampleRate * (tones ? duration : duration));
  const dataSize = numSamples * 2; // 16-bit mono
  const fileSize = 44 + dataSize;

  const buf = Buffer.alloc(fileSize);

  // RIFF header
  buf.write('RIFF', 0);
  buf.writeUInt32LE(fileSize - 8, 4);
  buf.write('WAVE', 8);

  // fmt chunk
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);       // chunk size
  buf.writeUInt16LE(1, 20);        // PCM format
  buf.writeUInt16LE(1, 22);        // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32);        // block align
  buf.writeUInt16LE(16, 34);       // bits per sample

  // data chunk
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample;

    if (tones) {
      // Multi-tone mode: each tone starts at a given time offset
      sample = 0;
      for (const tone of tones) {
        const tLocal = t - tone.start;
        if (tLocal >= 0) {
          const decay = Math.exp(-tLocal * 12);
          sample += Math.sin(2 * Math.PI * tone.freq * tLocal) * decay;
        }
      }
      sample = sample / tones.length * volume;
    } else {
      // Default: two simultaneous tones with decay
      const decay = Math.exp(-t * 10);
      const s1 = Math.sin(2 * Math.PI * frequency * t);
      const s2 = Math.sin(2 * Math.PI * frequency2 * t) * 0.6;
      sample = (s1 + s2) * decay * volume;
    }

    const value = Math.max(-1, Math.min(1, sample));
    buf.writeInt16LE(Math.floor(value * 32767), 44 + i * 2);
  }

  return buf;
}

function synthesizePreset(presetName) {
  const preset = PRESETS[presetName];
  if (!preset) return null;
  const wavBuf = generateWav(preset.synth);
  const tmpPath = path.join(os.tmpdir(), 'tonton-' + presetName + '-' + process.pid + '.wav');
  fs.writeFileSync(tmpPath, wavBuf);
  return { filePath: tmpPath, cleanup: true };
}

function resolveMacosSound(name) {
  if (name === 'default' || name === 'chime') name = 'Ping';

  // Try exact match first
  const filePath = path.join(MACOS_SOUNDS_DIR, name + '.aiff');
  if (fs.existsSync(filePath)) {
    return { filePath, cleanup: false };
  }

  // Try case-insensitive
  try {
    const files = fs.readdirSync(MACOS_SOUNDS_DIR);
    const match = files.find(f => f.toLowerCase() === (name + '.aiff').toLowerCase());
    if (match) {
      return { filePath: path.join(MACOS_SOUNDS_DIR, match), cleanup: false };
    }
  } catch {}

  return null;
}

function resolveLinuxSound(name) {
  if (name !== 'default' && name !== 'chime') {
    // Try to find a named sound in freedesktop dirs
    for (const dir of FREEDESKTOP_DIRS) {
      for (const ext of ['.oga', '.ogg', '.wav']) {
        const filePath = path.join(dir, name + ext);
        if (fs.existsSync(filePath)) {
          return { filePath, cleanup: false };
        }
      }
    }
  }

  // Try default freedesktop sounds
  const defaults = ['complete.oga', 'bell.oga', 'message-new-instant.oga', 'message.oga'];
  for (const dir of FREEDESKTOP_DIRS) {
    for (const file of defaults) {
      const filePath = path.join(dir, file);
      if (fs.existsSync(filePath)) {
        return { filePath, cleanup: false };
      }
    }
  }

  return null;
}

function resolveWindowsSound(name) {
  if (name !== 'default' && name !== 'chime') {
    const filePath = path.join(WINDOWS_SOUNDS_DIR, name + '.wav');
    if (fs.existsSync(filePath)) {
      return { filePath, cleanup: false };
    }
  }

  const defaults = ['notify.wav', 'chimes.wav', 'tada.wav', 'Windows Notify System Generic.wav'];
  for (const file of defaults) {
    const filePath = path.join(WINDOWS_SOUNDS_DIR, file);
    if (fs.existsSync(filePath)) {
      return { filePath, cleanup: false };
    }
  }

  return null;
}

function synthesizeToTemp() {
  const wavBuf = generateWav();
  const tmpPath = path.join(os.tmpdir(), 'tonton-chime-' + process.pid + '.wav');
  fs.writeFileSync(tmpPath, wavBuf);
  return { filePath: tmpPath, cleanup: true };
}

function resolveSound(name = 'default') {
  const platform = process.platform;
  const preset = PRESETS[name];

  // If it's a preset (done/input), use platform-specific sound or synth
  if (preset) {
    if (platform === 'darwin') {
      return resolveMacosSound(preset.macos) || synthesizePreset(name);
    }
    return synthesizePreset(name);
  }

  if (platform === 'darwin') {
    return resolveMacosSound(name) || synthesizeToTemp();
  }

  if (platform === 'linux') {
    return resolveLinuxSound(name) || synthesizeToTemp();
  }

  if (platform === 'win32') {
    return resolveWindowsSound(name) || synthesizeToTemp();
  }

  // Unknown platform — synthesize
  return synthesizeToTemp();
}

function listSounds() {
  const platform = process.platform;
  const sounds = [];

  if (platform === 'darwin') {
    try {
      const files = fs.readdirSync(MACOS_SOUNDS_DIR);
      for (const f of files) {
        if (f.endsWith('.aiff')) {
          sounds.push(f.replace('.aiff', ''));
        }
      }
    } catch {}
  } else if (platform === 'linux') {
    for (const dir of FREEDESKTOP_DIRS) {
      try {
        const files = fs.readdirSync(dir);
        for (const f of files) {
          const name = f.replace(/\.(oga|ogg|wav)$/, '');
          if (name !== f && !sounds.includes(name)) {
            sounds.push(name);
          }
        }
      } catch {}
    }
  } else if (platform === 'win32') {
    try {
      const files = fs.readdirSync(WINDOWS_SOUNDS_DIR);
      for (const f of files) {
        if (f.endsWith('.wav')) {
          sounds.push(f.replace('.wav', ''));
        }
      }
    } catch {}
  }

  if (!sounds.includes('chime')) {
    sounds.push('chime');
  }

  return sounds.sort();
}

module.exports = { resolveSound, listSounds, generateWav };
