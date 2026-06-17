'use strict';

const { execFile, exec } = require('child_process');
const { execFileSync } = require('child_process');
const fs = require('fs');

const TIMEOUT = 5000;
let cachedLinuxPlayer = undefined; // undefined = not detected yet

function findLinuxPlayer() {
  if (cachedLinuxPlayer !== undefined) return cachedLinuxPlayer;

  const players = [
    { cmd: 'paplay', args: (f) => [f] },
    { cmd: 'pw-play', args: (f) => [f] },
    { cmd: 'aplay', args: (f) => [f], wavOnly: true },
    { cmd: 'ffplay', args: (f) => ['-nodisp', '-autoexit', '-loglevel', 'quiet', f] },
    { cmd: 'play', args: (f) => ['-q', f] },
    { cmd: 'mpg123', args: (f) => ['-q', f] },
  ];

  for (const player of players) {
    try {
      execFileSync('which', [player.cmd], { stdio: 'ignore' });
      cachedLinuxPlayer = player;
      return player;
    } catch {}
  }

  cachedLinuxPlayer = null;
  return null;
}

function cleanup(soundInfo) {
  if (soundInfo.cleanup && soundInfo.filePath) {
    fs.unlink(soundInfo.filePath, () => {}); // ignore errors
  }
}

function playDarwin(soundInfo, options = {}) {
  return new Promise((resolve) => {
    const args = [soundInfo.filePath];
    if (options.volume != null) {
      args.push('-v', String(options.volume));
    }

    const child = execFile('afplay', args, { timeout: TIMEOUT }, (err) => {
      cleanup(soundInfo);
      resolve();
    });

    child.on('error', () => {
      cleanup(soundInfo);
      resolve();
    });
  });
}

function playLinux(soundInfo, options = {}) {
  return new Promise((resolve) => {
    const player = findLinuxPlayer();

    if (!player) {
      cleanup(soundInfo);
      bellFallback();
      resolve();
      return;
    }

    // If player only supports wav but file isn't wav, need synthesized wav
    if (player.wavOnly && !soundInfo.filePath.endsWith('.wav')) {
      const { synthesizeToTemp } = require('./sounds');
      cleanup(soundInfo);
      soundInfo = synthesizeToTemp();
    }

    const args = player.args(soundInfo.filePath);
    const child = execFile(player.cmd, args, { timeout: TIMEOUT }, (err) => {
      cleanup(soundInfo);
      resolve();
    });

    child.on('error', () => {
      cleanup(soundInfo);
      bellFallback();
      resolve();
    });
  });
}

function playWindows(soundInfo, options = {}) {
  return new Promise((resolve) => {
    const escaped = soundInfo.filePath.replace(/'/g, "''");
    const cmd = `powershell -Command "(New-Object System.Media.SoundPlayer '${escaped}').PlaySync()"`;

    exec(cmd, { timeout: TIMEOUT }, (err) => {
      cleanup(soundInfo);
      if (err) {
        // Fallback to Console.Beep
        exec('powershell -Command "[System.Console]::Beep(880, 300)"', { timeout: TIMEOUT }, () => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
}

function bellFallback() {
  try {
    process.stdout.write('\x07');
  } catch {}
}

function playSound(soundInfo, options = {}) {
  const platform = process.platform;

  if (platform === 'darwin') return playDarwin(soundInfo, options);
  if (platform === 'linux') return playLinux(soundInfo, options);
  if (platform === 'win32') return playWindows(soundInfo, options);

  // Unknown platform
  cleanup(soundInfo);
  bellFallback();
  return Promise.resolve();
}

module.exports = { playSound };
