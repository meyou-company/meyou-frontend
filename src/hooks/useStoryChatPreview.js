import { useEffect, useState } from 'react';
import { storiesApi } from '../services/storiesApi';

const cache = new Map();
const inflight = new Map();

async function fetchPreview(storyId) {
  if (!storyId) return { available: false };
  const cached = cache.get(storyId);
  if (cached) return cached;

  if (inflight.has(storyId)) {
    return inflight.get(storyId);
  }

  const promise = storiesApi
    .getChatPreviews([storyId])
    .then((previews) => {
      const row = previews?.find((item) => String(item.storyId) === String(storyId))
        || { storyId, available: false };
      cache.set(storyId, row);
      inflight.delete(storyId);
      return row;
    })
    .catch(() => {
      const row = { storyId, available: false };
      cache.set(storyId, row);
      inflight.delete(storyId);
      return row;
    });

  inflight.set(storyId, promise);
  return promise;
}

export function invalidateStoryChatPreviewCache(storyId) {
  if (storyId) cache.delete(storyId);
  else cache.clear();
}

export function useStoryChatPreview(storyId) {
  const [state, setState] = useState(() => ({
    loading: Boolean(storyId),
    preview: storyId ? cache.get(storyId) : null,
  }));

  useEffect(() => {
    if (!storyId) {
      setState({ loading: false, preview: null });
      return undefined;
    }

    let active = true;
    const cached = cache.get(storyId);
    if (cached) {
      setState({ loading: false, preview: cached });
      return undefined;
    }

    setState({ loading: true, preview: null });
    fetchPreview(storyId).then((preview) => {
      if (active) setState({ loading: false, preview });
    });

    return () => {
      active = false;
    };
  }, [storyId]);

  return state;
}