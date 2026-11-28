import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const broadcastPath = path.join(__dirname, 'LiveBroadcast.jsx');

/**
 * Stage 6.1 / 016: document why message polling stays (no runtime change in this PR).
 */
describe('LiveBroadcast polling fallback (016)', () => {
  const source = readFileSync(broadcastPath, 'utf8');

  it('keeps 3s message history sync alongside live socket handlers', () => {
    expect(source).toMatch(/setInterval\(syncMessages,\s*3_000\)/);
    expect(source).toContain('live:message:new');
    expect(source).toContain('liveStreamsApi.getMessages');
  });

  it('keeps counter sync interval as HTTP fallback', () => {
    expect(source).toMatch(/setInterval\(syncCounters,\s*COUNTER_SYNC_INTERVAL_MS\)/);
    expect(source).toContain('live:reaction:summary');
    expect(source).toContain('liveStreamsApi.getById');
  });
});