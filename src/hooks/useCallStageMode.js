import { useEffect, useState } from 'react';

export function useCallStageMode(shares) {
  const key = shares.map(share => share.identity).sort().join('\n');
  const [choice, setChoice] = useState({ key: '', mode: 'participants' });
  useEffect(() => {
    setChoice({ key, mode: key ? 'screen' : 'participants' });
  }, [key]);
  const mode = !key ? 'participants' : choice.key === key ? choice.mode : 'screen';
  return { mode, setMode: next => setChoice({ key, mode: next }) };
}
