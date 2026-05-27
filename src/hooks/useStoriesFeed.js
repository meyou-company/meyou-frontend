import { useCallback, useEffect, useState } from "react";
import { storiesApi } from "../services/storiesApi";

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
        : response?.items || response?.groups || [];

      setStoriesGroups(normalized);
    } catch (e) {
      console.error("Stories feed failed", e);

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