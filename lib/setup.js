'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');

// Claude Code hook format: { matcher: "", hooks: [{ type, command }] }
const HOOKS = {
  Notification: {
    matcher: '',
    hooks: [{ type: 'command', command: 'npx tonton-cli --input' }],
  },
  Stop: {
    matcher: '',
    hooks: [{ type: 'command', command: 'npx tonton-cli --done' }],
  },
};

function readSettings() {
  try {
    const raw = fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeSettings(settings) {
  const dir = path.dirname(CLAUDE_SETTINGS_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n');
}

function hookExists(entries, command) {
  return entries.some(e =>
    e.hooks && e.hooks.some(h => h.command === command)
  );
}

function setup() {
  const settings = readSettings();

  if (!settings.hooks) settings.hooks = {};

  let added = 0;

  for (const [event, entry] of Object.entries(HOOKS)) {
    if (!settings.hooks[event]) settings.hooks[event] = [];

    const command = entry.hooks[0].command;

    if (!hookExists(settings.hooks[event], command)) {
      settings.hooks[event].push(entry);
      added++;
      console.log(`  + ${event} → ${command}`);
    } else {
      console.log(`  ~ ${event} → already configured`);
    }
  }

  if (added > 0) {
    writeSettings(settings);
    console.log(`\nWrote ${CLAUDE_SETTINGS_PATH}`);
  }

  console.log('\nDone! Claude Code will now play:');
  console.log('  --done sound   when the agent finishes (Stop)');
  console.log('  --input sound  when the agent needs you (Notification)');
}

function unsetup() {
  const settings = readSettings();

  if (!settings.hooks) {
    console.log('No hooks found — nothing to remove.');
    return;
  }

  let removed = 0;

  for (const [event, entry] of Object.entries(HOOKS)) {
    if (!settings.hooks[event]) continue;

    const command = entry.hooks[0].command;
    const before = settings.hooks[event].length;
    settings.hooks[event] = settings.hooks[event].filter(e =>
      !(e.hooks && e.hooks.some(h => h.command === command))
    );
    const after = settings.hooks[event].length;

    if (before !== after) {
      removed++;
      console.log(`  - ${event} → removed`);
    }

    if (settings.hooks[event].length === 0) {
      delete settings.hooks[event];
    }
  }

  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  if (removed > 0) {
    writeSettings(settings);
    console.log(`\nWrote ${CLAUDE_SETTINGS_PATH}`);
  } else {
    console.log('No tonton hooks found — nothing to remove.');
  }
}

module.exports = { setup, unsetup };
