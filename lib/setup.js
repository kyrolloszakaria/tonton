'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');

// Hooks run in sh which has a minimal PATH — resolve absolute paths at setup time.
function resolveCommand(flag) {
  // If tonton is globally installed, use its absolute path
  try {
    const tontonPath = execFileSync('which', ['tonton'], { encoding: 'utf8' }).trim();
    if (tontonPath) return `${tontonPath} ${flag}`;
  } catch {}

  // Otherwise use the current node binary + this package's bin script
  const nodePath = process.execPath;
  const tontonBin = path.resolve(__dirname, '..', 'bin', 'tonton.js');
  return `${nodePath} ${tontonBin} ${flag}`;
}

// Claude Code hook format: { matcher: "", hooks: [{ type, command }] }
// "Stop" fires when Claude finishes its turn (done working, asking a question, etc.)
// "Notification" fires for interactive prompts (permission dialogs, user questions, idle alerts)
function buildHooks() {
  return {
    Stop: {
      matcher: '',
      hooks: [{ type: 'command', command: resolveCommand('--done') }],
    },
    Notification: {
      matcher: '',
      hooks: [{ type: 'command', command: resolveCommand('--input') }],
    },
  };
}

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
  const HOOKS = buildHooks();

  if (!settings.hooks) settings.hooks = {};

  // Remove any old tonton hooks (Notification, old Stop commands) before adding new ones
  removeTontonHooks(settings);
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

  console.log('\nDone! Claude Code will now play a sound when the agent stops and needs your attention.');
}

function isTontonCommand(cmd) {
  return cmd && (cmd.includes('tonton-cli') || cmd.includes('tonton.js') || /\btonton\b/.test(cmd));
}

function removeTontonHooks(settings) {
  if (!settings.hooks) return 0;

  let removed = 0;
  for (const event of Object.keys(settings.hooks)) {
    const before = settings.hooks[event].length;
    settings.hooks[event] = settings.hooks[event].filter(e =>
      !(e.hooks && e.hooks.some(h => isTontonCommand(h.command)))
    );
    removed += before - settings.hooks[event].length;

    if (settings.hooks[event].length === 0) {
      delete settings.hooks[event];
    }
  }

  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  return removed;
}

function unsetup() {
  const settings = readSettings();

  if (!settings.hooks) {
    console.log('No hooks found — nothing to remove.');
    return;
  }

  const removed = removeTontonHooks(settings);

  if (removed > 0) {
    writeSettings(settings);
    console.log(`  - Removed ${removed} tonton hook(s)`);
    console.log(`\nWrote ${CLAUDE_SETTINGS_PATH}`);
  } else {
    console.log('No tonton hooks found — nothing to remove.');
  }
}

module.exports = { setup, unsetup };
