#!/usr/bin/env node
'use strict';

const { play, listSounds } = require('../lib/index');
const { version } = require('../package.json');

const args = process.argv.slice(2);
let sound = undefined;
let vol = undefined;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '-h' || arg === '--help') {
    console.log(`tonton v${version} — notification sound for your terminal

Usage: tonton [options]

Setup:
  --setup               Auto-configure Claude Code hooks (one-time)
  --remove              Remove tonton hooks from Claude Code

Presets:
  -d, --done            Agent finished (descending chime)
  -i, --input           Agent needs input (ascending chime)

Options:
  -s, --sound <name>    Sound to play (default: "Ping" on macOS, "chime" elsewhere)
  -v, --volume <0-1>    Volume level, 0.0 to 1.0 (macOS only, default: 1.0)
  -m, --mute            Mute all sounds (persists across runs)
  -u, --unmute          Unmute sounds
  --status              Show current mute status
  -l, --list            List available sounds
  -h, --help            Show this help
  --version             Show version

Quick start:
  npx tonton-cli --setup                  Configure Claude Code hooks automatically

Examples:
  npx tonton-cli                          Play default notification sound
  npx tonton-cli --done                   Agent finished working
  npx tonton-cli --input                  Agent needs your attention
  npx tonton-cli -s Glass                 Play the Glass sound (macOS)

After any command:
  codex "fix the bug" ; npx tonton-cli --done`);
    process.exit(0);
  }

  if (arg === '--version') {
    console.log(version);
    process.exit(0);
  }

  if (arg === '--setup') {
    console.log('Setting up Claude Code hooks...\n');
    require('../lib/setup').setup();
    process.exit(0);
  }

  if (arg === '--remove') {
    console.log('Removing tonton hooks...\n');
    require('../lib/setup').unsetup();
    process.exit(0);
  }

  if (arg === '-m' || arg === '--mute') {
    require('../lib/config').setMuted(true);
    console.log('Muted. Run tonton --unmute to re-enable sounds.');
    process.exit(0);
  }

  if (arg === '-u' || arg === '--unmute') {
    require('../lib/config').setMuted(false);
    console.log('Unmuted. Sounds are back on.');
    process.exit(0);
  }

  if (arg === '--status') {
    const muted = require('../lib/config').isMuted();
    console.log(muted ? 'Muted' : 'Unmuted');
    process.exit(0);
  }

  if (arg === '-l' || arg === '--list') {
    const sounds = listSounds();
    console.log('Available sounds:');
    for (const s of sounds) {
      console.log('  ' + s);
    }
    process.exit(0);
  }

  if (arg === '-d' || arg === '--done') {
    sound = 'done';
    continue;
  }

  if (arg === '-i' || arg === '--input') {
    sound = 'input';
    continue;
  }

  if ((arg === '-s' || arg === '--sound') && i + 1 < args.length) {
    sound = args[++i];
    continue;
  }

  if ((arg === '-v' || arg === '--volume') && i + 1 < args.length) {
    vol = parseFloat(args[++i]);
    continue;
  }
}

play({ sound, volume: vol }).then(() => {
  process.exit(0);
}).catch(() => {
  process.exit(0);
});
