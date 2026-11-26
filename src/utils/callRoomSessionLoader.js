/**
 * Thin facade so CallsProvider never statically imports livekit-client.
 * All call-room teardown goes through a serialized queue (no overlapping clears).
 */

let modulePromise = null;
let operationChain = Promise.resolve();

export function loadCallRoomSessionModule() {
  if (!modulePromise) {
    modulePromise = import('./callRoomSession.js');
  }
  return modulePromise;
}

function enqueueCallRoomSessionOp(operation) {
  const run = operationChain.then(operation, operation);
  operationChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/**
 * Clears any shared LiveKit room held for call remounts (async module load).
 */
export function clearSharedCallRoom(reason = 'clear') {
  return enqueueCallRoomSessionOp(async () => {
    const mod = await loadCallRoomSessionModule();
    await mod.clearSharedCallRoom(reason);
  });
}

/** Preload call room + overlay graph (incoming ring, accept path). */
export function preloadCallRoomSessionModule() {
  return loadCallRoomSessionModule();
}