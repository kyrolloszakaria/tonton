'use strict';

const assert = require('assert');
const { execFileSync } = require('child_process');
const path = require('path');

const { generateWav, listSounds, resolveSound } = require('../lib/sounds');
const { play } = require('../lib/index');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
  }
}

console.log('\ntonton tests\n');

// --- WAV synthesis ---
console.log('WAV synthesis:');

test('generateWav returns a Buffer', () => {
  const wav = generateWav();
  assert(Buffer.isBuffer(wav));
});

test('WAV has RIFF header', () => {
  const wav = generateWav();
  assert.strictEqual(wav.toString('ascii', 0, 4), 'RIFF');
});

test('WAV has WAVE format', () => {
  const wav = generateWav();
  assert.strictEqual(wav.toString('ascii', 8, 12), 'WAVE');
});

test('WAV has correct file size in header', () => {
  const wav = generateWav();
  const reportedSize = wav.readUInt32LE(4) + 8;
  assert.strictEqual(reportedSize, wav.length);
});

test('WAV is small (under 10KB)', () => {
  const wav = generateWav();
  assert(wav.length < 10000, `WAV is ${wav.length} bytes`);
});

test('WAV has PCM format (1)', () => {
  const wav = generateWav();
  assert.strictEqual(wav.readUInt16LE(20), 1);
});

test('WAV is mono', () => {
  const wav = generateWav();
  assert.strictEqual(wav.readUInt16LE(22), 1);
});

test('WAV is 16-bit', () => {
  const wav = generateWav();
  assert.strictEqual(wav.readUInt16LE(34), 16);
});

// --- Sound resolution ---
console.log('\nSound resolution:');

test('resolveSound returns an object with filePath', () => {
  const info = resolveSound();
  assert(info.filePath, 'should have filePath');
  assert(typeof info.cleanup === 'boolean', 'should have cleanup flag');
});

test('resolveSound default returns existing file', () => {
  const info = resolveSound('default');
  const fs = require('fs');
  assert(fs.existsSync(info.filePath), `file should exist: ${info.filePath}`);
  // Clean up if temp
  if (info.cleanup) fs.unlinkSync(info.filePath);
});

test('resolveSound nonexistent falls back gracefully', () => {
  const info = resolveSound('this_sound_does_not_exist_xyz');
  assert(info.filePath, 'should still resolve to something');
  const fs = require('fs');
  if (info.cleanup) fs.unlinkSync(info.filePath);
});

// --- listSounds ---
console.log('\nlistSounds:');

test('listSounds returns a non-empty array', () => {
  const sounds = listSounds();
  assert(Array.isArray(sounds));
  assert(sounds.length > 0, 'should have at least one sound');
});

test('listSounds always includes chime', () => {
  const sounds = listSounds();
  assert(sounds.includes('chime'), 'should include synthetic chime');
});

if (process.platform === 'darwin') {
  test('listSounds includes Ping on macOS', () => {
    const sounds = listSounds();
    assert(sounds.includes('Ping'), 'should include Ping');
  });
}

// --- CLI ---
console.log('\nCLI:');

const cli = path.join(__dirname, '..', 'bin', 'tonton.js');

test('--help exits 0 and shows usage', () => {
  const output = execFileSync('node', [cli, '--help'], { encoding: 'utf8' });
  assert(output.includes('Usage:'), 'should show usage');
  assert(output.includes('--sound'), 'should mention --sound');
});

test('--version exits 0 and shows version', () => {
  const output = execFileSync('node', [cli, '--version'], { encoding: 'utf8' });
  const pkg = require('../package.json');
  assert(output.trim() === pkg.version, `expected ${pkg.version}, got ${output.trim()}`);
});

test('--list exits 0 and shows sounds', () => {
  const output = execFileSync('node', [cli, '--list'], { encoding: 'utf8' });
  assert(output.includes('Available sounds:'), 'should list sounds');
  assert(output.includes('chime'), 'should include chime');
});

// --- Summary ---
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
