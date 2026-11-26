import { describe, expect, it, vi, beforeEach } from 'vitest';

const clearImpl = vi.fn(async () => undefined);

vi.mock('./callRoomSession.js', () => ({
  clearSharedCallRoom: (...args) => clearImpl(...args),
}));

describe('callRoomSessionLoader', () => {
  beforeEach(async () => {
    vi.resetModules();
    clearImpl.mockClear();
  });

  it('loads the room module once for multiple clears', async () => {
    const { clearSharedCallRoom, loadCallRoomSessionModule } = await import(
      './callRoomSessionLoader.js'
    );
    await Promise.all([
      clearSharedCallRoom('a'),
      clearSharedCallRoom('b'),
    ]);
    expect(clearImpl).toHaveBeenCalledTimes(2);
    expect(clearImpl.mock.calls[0][0]).toBe('a');
    expect(clearImpl.mock.calls[1][0]).toBe('b');
    const first = loadCallRoomSessionModule();
    const second = loadCallRoomSessionModule();
    expect(first).toBe(second);
    await first;
  });

  it('serializes overlapping clear operations', async () => {
    const order = [];
    clearImpl.mockImplementation(async (reason) => {
      order.push(`start:${reason}`);
      await new Promise((r) => setTimeout(r, 5));
      order.push(`end:${reason}`);
    });
    const { clearSharedCallRoom } = await import('./callRoomSessionLoader.js');
    void clearSharedCallRoom('first');
    void clearSharedCallRoom('second');
    await clearSharedCallRoom('third');
    expect(order).toEqual([
      'start:first',
      'end:first',
      'start:second',
      'end:second',
      'start:third',
      'end:third',
    ]);
  });
});