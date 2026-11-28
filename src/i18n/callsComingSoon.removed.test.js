import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const localesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'locales',
);

describe('i18n callsComingSoon removal (020)', () => {
  it('has no callsComingSoon key in any locale JSON', () => {
    const files = readdirSync(localesDir).filter((f) => f.endsWith('.json'));
    expect(files.length).toBe(8);
    for (const file of files) {
      const raw = readFileSync(path.join(localesDir, file), 'utf8');
      expect(raw).not.toContain('"callsComingSoon"');
    }
  });
});