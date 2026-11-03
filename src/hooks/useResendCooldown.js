import { useEffect, useRef, useState } from 'react';
import { RESEND_COOLDOWN_SECONDS } from '../constants/verificationCode';

export function useResendCooldown() {
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setSecondsLeft((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  const start = (seconds) => {
    const value = Math.ceil(Number(seconds));
    if (!Number.isFinite(value) || value <= 0) return;
    setSecondsLeft(value);
  };

  const tryStartRequest = () => {
    if (inFlightRef.current || secondsLeft > 0) return false;
    inFlightRef.current = true;
    return true;
  };

  const endRequest = () => {
    inFlightRef.current = false;
  };

  return {
    secondsLeft,
    isCoolingDown: secondsLeft > 0,
    start,
    tryStartRequest,
    endRequest,
  };
}
