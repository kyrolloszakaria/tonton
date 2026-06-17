'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');

const HOOKS = {
  Notification: { type: 'command', command: 'npx tonton-cli --input' },
  AfterAssistantTurn: { type: 'command', command: 'npx tonton-cli --done' },
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

function hookExists(hooks, newHook) {
  return hooks.some(h => h.command === newHook.command);
}

function setup() {
  const settings = readSettings();

  if (!settings.hooks) settings.hooks = {};

  let added = 0;

  for (const [event, hook] of Object.entries(HOOKS)) {
    if (!settings.hooks[event]) settings.hooks[event] = [];

    if (!hookExists(settings.hooks[event], hook)) {
      settings.hooks[event].push(hook);
      added++;
      console.log(`  + ${event} → ${hook.command}`);
    } else {
      console.log(`  ~ ${event} → already configured`);
    }
  }

  if (added > 0) {
    writeSettings(settings);
    console.log(`\nWrote ${CLAUDE_SETTINGS_PATH}`);
  }

  console.log('\nDone! Claude Code will now play:');
  console.log('  --done sound   when the agent finishes');
  console.log('  --input sound  when the agent needs you');
}

function unsetup() {
  const settings = readSettings();

  if (!settings.hooks) {
    console.log('No hooks found — nothing to remove.');
    return;
  }

  let removed = 0;

  for (const [event, hook] of Object.entries(HOOKS)) {
    if (!settings.hooks[event]) continue;

    const before = settings.hooks[event].length;
    settings.hooks[event] = settings.hooks[event].filter(h => h.command !== hook.command);
    const after = settings.hooks[event].length;

    if (before !== after) {
      removed++;
      console.log(`  - ${event} → removed`);
    }

    // Clean up empty arrays
    if (settings.hooks[event].length === 0) {
      delete settings.hooks[event];
    }
  }

  // Clean up empty hooks object
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
