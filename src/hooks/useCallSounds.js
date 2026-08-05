import { useCallback, useEffect, useRef, useState } from 'react';

const INCOMING_SRC = '/sounds/incoming-call.wav';
const OUTGOING_SRC = '/sounds/outgoing-call.wav';
const ENDED_SRC = '/sounds/call-ended.wav';

function makeAudio(src, { loop = false, volume = 0.85 } = {}) {
  const audio = new Audio(src);
  audio.loop = loop;
  audio.preload = 'auto';
  audio.volume = volume;
  return audio;
}

async function safePlay(audio) {
  if (!audio) return false;
  try {
    if (audio.currentTime > 0) audio.currentTime = 0;
    await audio.play();
    return true;
  } catch (err) {
    console.warn('[call-sounds] play blocked', err?.name || err);
    return false;
  }
}

function safeStop(audio) {
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch {
    /* ignore */
  }
}

/**
 * Ringtone / ringback / end-tone for 1:1 calls.
 * Instances live in refs — not recreated each render.
 */
export function useCallSounds() {
  const incomingRef = useRef(null);
  const outgoingRef = useRef(null);
  const endedRef = useRef(null);
  const unlockedRef = useRef(false);
  const [needsUnlock, setNeedsUnlock] = useState(false);

  useEffect(() => {
    incomingRef.current = makeAudio(INCOMING_SRC, { loop: true, volume: 0.9 });
    outgoingRef.current = makeAudio(OUTGOING_SRC, { loop: true, volume: 0.7 });
    endedRef.current = makeAudio(ENDED_SRC, { loop: false, volume: 0.85 });

    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      setNeedsUnlock(false);
      for (const ref of [incomingRef, outgoingRef, endedRef]) {
        const a = ref.current;
        if (!a) continue;
        try {
          a.muted = true;
          void a
            .play()
            .then(() => {
              a.pause();
              a.currentTime = 0;
              a.muted = false;
            })
            .catch(() => {
              a.muted = false;
            });
        } catch {
          a.muted = false;
        }
      }
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
      safeStop(incomingRef.current);
      safeStop(outgoingRef.current);
      safeStop(endedRef.current);
      incomingRef.current = null;
      outgoingRef.current = null;
      endedRef.current = null;
    };
  }, []);

  const stopRinging = useCallback(() => {
    safeStop(incomingRef.current);
    safeStop(outgoingRef.current);
  }, []);

  const stopAll = useCallback(() => {
    stopRinging();
    safeStop(endedRef.current);
  }, [stopRinging]);

  const playIncoming = useCallback(async () => {
    safeStop(outgoingRef.current);
    safeStop(endedRef.current);
    const audio = incomingRef.current;
    if (!audio) return;
    if (!audio.paused && !audio.ended) return;
    const ok = await safePlay(audio);
    if (!ok) setNeedsUnlock(true);
  }, []);

  const playOutgoing = useCallback(async () => {
    safeStop(incomingRef.current);
    safeStop(endedRef.current);
    const audio = outgoingRef.current;
    if (!audio) return;
    if (!audio.paused && !audio.ended) return;
    const ok = await safePlay(audio);
    if (!ok) setNeedsUnlock(true);
  }, []);

  const playEnded = useCallback(async () => {
    stopRinging();
    const audio = endedRef.current;
    if (!audio) return;
    const ok = await safePlay(audio);
    if (!ok) setNeedsUnlock(true);
  }, [stopRinging]);

  const dismissUnlockHint = useCallback(() => {
    unlockedRef.current = true;
    setNeedsUnlock(false);
  }, []);

  return {
    playIncoming,
    playOutgoing,
    playEnded,
    stopRinging,
    stopAll,
    needsUnlock,
    dismissUnlockHint,
  };
}
