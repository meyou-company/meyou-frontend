import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.dirname(fileURLToPath(import.meta.url));

describe('SCSS entrypoints (017)', () => {
  it('does not use deprecated @import in shared style entrypoints', () => {
    const indexScss = readFileSync(path.join(root, 'index.scss'), 'utf8');
    const settingsShell = readFileSync(
      path.join(root, '..', 'components', 'Settings', 'SettingsPageShell.scss'),
      'utf8',
    );
    expect(indexScss).not.toMatch(/@import\s+['"]/);
    expect(settingsShell).not.toMatch(/@import\s+['"]/);
    expect(indexScss).toContain("@use './burger-menu-tokens.scss'");
    expect(settingsShell).toContain("@use '../../styles/settings-tokens.scss'");
  });
});