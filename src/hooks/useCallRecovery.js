import { useEffect, useRef, useState } from 'react';
import { callsApi } from '../services/callsApi';
import { getCallDisconnectReasonName } from '../utils/callRoomSession';

export function useCallRecovery(call, media, group = false) {
  const [replacement, setReplacement] = useState(null);
  const [lost, setLost] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState(null);
  const [reason, setReason] = useState(null);
  const requestRef = useRef(0);
  const busyRef = useRef(false);
  const callId = call?.id;
  useEffect(() => () => { requestRef.current++; }, [callId]);

  const disconnected = value => {
    busyRef.current = false; setBusy(false);
    setLost(true);
    setReason(value == null ? null : getCallDisconnectReasonName(value));
    console.warn('[calls] media disconnected', { callId, reason: getCallDisconnectReasonName(value) });
  };
  const connected = () => { busyRef.current = false; setBusy(false); setLost(false); setReason(null); setErrorKey(null); };
  const retry = async () => {
    if (busyRef.current || !callId) return;
    const request = ++requestRef.current;
    busyRef.current = true; setBusy(true); setErrorKey(null);
    let reconnecting = false;
    try {
      const active = await callsApi.getActive();
      if (request !== requestRef.current) return;
      if (String(active?.call?.id) !== String(callId) || active?.call?.status !== 'ACTIVE') {
        setErrorKey('messenger.calls.ended'); return;
      }
      const result = group ? await callsApi.join(callId) : active;
      if (request !== requestRef.current) return;
      if (!result?.media?.url || !result?.media?.token) throw new Error('Missing reconnect media');
      // A new attempt is intentional even if the backend returns the same JWT.
      setReplacement(previous => ({ callId, media: result.media, attempt: (previous?.attempt || 0) + 1 }));
      reconnecting = true;
    } catch {
      if (request === requestRef.current) setErrorKey('messenger.calls.connectFailed');
    } finally {
      if (!reconnecting) {
        busyRef.current = false;
        if (request === requestRef.current) setBusy(false);
      }
    }
  };
  return { media: replacement?.callId === callId ? replacement.media : media,
    attempt: replacement?.callId === callId ? replacement.attempt : 0,
    lost, busy, errorKey, reason, retry, connected, disconnected };
}
