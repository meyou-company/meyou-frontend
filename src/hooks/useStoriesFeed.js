import { useCallback, useEffect, useState } from 'react';
import { storiesApi } from '../services/storiesApi';

export function useStoriesFeed() {
  const [storiesGroups, setStoriesGroups] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [storiesError, setStoriesError] = useState(null);

  const loadStories = useCallback(async () => {
    try {
      setStoriesLoading(true);
      setStoriesError(null);

      const response = await storiesApi.getFeed();

      const normalized = Array.isArray(response)
        ? response
        : Array.isArray(response?.authors)
          ? response.authors
          : Array.isArray(response?.items)
            ? response.items
            : Array.isArray(response?.groups)
              ? response.groups
              : Array.isArray(response?.data?.authors)
                ? response.data.authors
                : Array.isArray(response?.data?.items)
                  ? response.data.items
                  : Array.isArray(response?.data?.groups)
                    ? response.data.groups
                    : [];

      setStoriesGroups(normalized);
    } catch (e) {
      console.error('[stories feed error]', e?.response?.data || e);
      console.error('Stories feed failed', e);

      // ВАЖНО:
      // не ломаем FirstPage если stories упали
      setStoriesError(e);
    } finally {
      setStoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  return {
    storiesGroups,
    storiesLoading,
    storiesError,
    reloadStories: loadStories,
    setStoriesGroups,
  };
}
