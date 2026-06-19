'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const TARGETS = {
  claude: {
    name: 'Claude Code',
    settingsPath: path.join(os.homedir(), '.claude', 'settings.json'),
    hooks: () => ({
      Stop: {
        matcher: '',
        hooks: [{ type: 'command', command: resolveCommand('--done') }],
      },
      Notification: {
        matcher: '',
        hooks: [{ type: 'command', command: resolveCommand('--input') }],
      },
      PermissionRequest: {
        matcher: '',
        hooks: [{ type: 'command', command: resolveCommand('--input') }],
      },
    }),
  },
  codex: {
    name: 'Codex CLI',
    settingsPath: path.join(os.homedir(), '.codex', 'hooks.json'),
    hooks: () => ({
      Stop: {
        matcher: '',
        hooks: [{ type: 'command', command: resolveCommand('--done') }],
      },
      PermissionRequest: {
        matcher: '',
        hooks: [{ type: 'command', command: resolveCommand('--input') }],
      },
    }),
  },
};

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

function readSettings(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeSettings(filePath, settings) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2) + '\n');
}

function hookExists(entries, command) {
  return entries.some(e =>
    e.hooks && e.hooks.some(h => h.command === command)
  );
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

function setupTarget(target) {
  const { name, settingsPath, hooks: buildHooks } = target;
  const settings = readSettings(settingsPath);
  const HOOKS = buildHooks();

  if (!settings.hooks) settings.hooks = {};

  // Remove any old tonton hooks before adding new ones
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
    writeSettings(settingsPath, settings);
    console.log(`  Wrote ${settingsPath}`);
  }

  return added;
}

function unsetupTarget(target) {
  const { name, settingsPath } = target;
  const settings = readSettings(settingsPath);

  if (!settings.hooks) return 0;

  const removed = removeTontonHooks(settings);

  if (removed > 0) {
    writeSettings(settingsPath, settings);
    console.log(`  - Removed ${removed} hook(s) from ${settingsPath}`);
  }

  return removed;
}

function setup() {
  let totalAdded = 0;

  for (const [key, target] of Object.entries(TARGETS)) {
    console.log(`\n${target.name}:`);
    totalAdded += setupTarget(target);
  }

  if (totalAdded > 0) {
    console.log('\nDone! Your AI coding tools will now play a sound when they need your attention.');
  } else {
    console.log('\nAll hooks already configured.');
  }
}

function unsetup() {
  let totalRemoved = 0;

  for (const [key, target] of Object.entries(TARGETS)) {
    totalRemoved += unsetupTarget(target);
  }

  if (totalRemoved === 0) {
    console.log('No tonton hooks found — nothing to remove.');
  } else {
    console.log(`\nRemoved ${totalRemoved} tonton hook(s).`);
  }
}

module.exports = { setup, unsetup };
