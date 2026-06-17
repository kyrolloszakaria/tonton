# tonton

Play a notification sound from your terminal. Zero dependencies. ~15KB.

Perfect for getting pinged when AI coding tools (Claude Code, Codex, etc.) finish a task — or need your attention.

## Quick Start

```bash
npx tonton --setup
```

That's it. Claude Code will now play:
- A **done** sound when the agent finishes
- An **input** sound when the agent needs you

## Install

```bash
npm install -g tonton
```

Or use without installing — `npx tonton` works everywhere.

## Two Sounds

| Command | When | macOS | Cross-platform |
|---------|------|-------|---------------|
| `tonton --done` | Agent finished | Glass | Descending chime |
| `tonton --input` | Agent needs you | Funk | Ascending chime |

```bash
tonton --done     # hear the "finished" sound
tonton --input    # hear the "need attention" sound
tonton            # default notification sound
```

## Use with AI CLI Tools

### Claude Code — automatic setup

```bash
npx tonton --setup
```

This adds hooks to `~/.claude/settings.json` so Claude Code plays distinct sounds when done vs. needing input. Run once, works forever.

To remove: `npx tonton --remove`

### Claude Code — manual setup

Add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "AfterAssistantTurn": [
      { "type": "command", "command": "npx tonton --done" }
    ],
    "Notification": [
      { "type": "command", "command": "npx tonton --input" }
    ]
  }
}
```

### Codex CLI

```bash
codex "fix the bug" ; npx tonton --done
```

### Any command

```bash
npm test ; npx tonton --done
long-running-task ; npx tonton
```

### Shell alias

```bash
# Add to ~/.zshrc or ~/.bashrc
notify() { "$@"; npx tonton --done; }

# Then use:
notify npm test
notify codex "refactor this"
```

## More Options

```bash
# Pick a specific sound (macOS system sounds)
tonton --sound Glass
tonton --sound Hero

# Adjust volume (macOS only)
tonton --volume 0.5

# List available sounds
tonton --list
```

## Programmatic API

```js
import { play, listSounds } from 'tonton';

await play();                          // default sound
await play({ sound: 'done' });         // completion sound
await play({ sound: 'input' });        // attention sound
await play({ sound: 'Glass' });        // macOS system sound
await play({ volume: 0.5 });           // half volume (macOS)

const sounds = listSounds();           // available sound names
```

## Cross-Platform

| Platform | Player | Sounds |
|----------|--------|--------|
| **macOS** | `afplay` (built-in) | 14 system sounds + synthesized chime |
| **Linux** | `paplay` / `aplay` / `ffplay` | Freedesktop sounds + synthesized chime |
| **Windows** | PowerShell SoundPlayer | Windows Media sounds + synthesized chime |

Falls back to a synthesized two-tone chime, then terminal bell — always plays something.

**Always exits 0.** A notification sound will never break your scripts, hooks, or CI.

## License

MIT
