import { useCallback, useEffect, useRef } from 'react';
import { getSocket } from '../services/socket';

const TYPING_IDLE_MS = 3000;

export function useTypingEmitter(conversationId) {
  const idleTimerRef = useRef(null);
  const isTypingRef = useRef(false);

  const stopTyping = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (!conversationId || !isTypingRef.current) return;
    getSocket()?.emit('typing.stop', { conversationId });
    isTypingRef.current = false;
  }, [conversationId]);

  const emitTyping = useCallback(() => {
    if (!conversationId) return;
    if (!isTypingRef.current) {
      getSocket()?.emit('typing.start', { conversationId });
      isTypingRef.current = true;
    }
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  }, [conversationId, stopTyping]);

  useEffect(() => () => stopTyping(), [stopTyping]);

  return { emitTyping, stopTyping };
}
