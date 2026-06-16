import { useCallback, useEffect, useState } from 'react';
import {
  STORY_CREATED_EVENT,
  STORY_DELETED_EVENT,
  STORY_REACTED_EVENT,
  STORY_REPLIED_EVENT,
  STORY_VIEWED_EVENT,
} from '../constants/storyEvents';
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

      const normalizedWithSortedStories = normalized.map((group) => ({
        ...group,
        stories: [...(group?.stories || [])].sort(
          (a, b) => new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime()
        ),
      }));
      setStoriesGroups(normalizedWithSortedStories);
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

  useEffect(() => {
    const reload = () => loadStories();
    const patchCounters = (event) => {
      const envelope = event?.detail || {};
      const storyId = envelope.storyId || envelope.id || envelope.story?.id;
      if (!storyId) return;

      setStoriesGroups((prev) =>
        prev.map((group) => ({
          ...group,
          stories: Array.isArray(group?.stories)
            ? group.stories.map((story) => {
                if (String(story?.id) !== String(storyId)) return story;
                const next = { ...story };
                if (typeof envelope.viewsCount === 'number') next.viewsCount = envelope.viewsCount;
                if (typeof envelope.repliesCount === 'number') next.repliesCount = envelope.repliesCount;
                if (typeof envelope.reactionsCount === 'number') next.reactionsCount = envelope.reactionsCount;
                if (typeof envelope.savesCount === 'number') next.savesCount = envelope.savesCount;
                return next;
              })
            : [],
        })),
      );
    };

    window.addEventListener(STORY_CREATED_EVENT, reload);
    window.addEventListener(STORY_DELETED_EVENT, reload);
    window.addEventListener(STORY_VIEWED_EVENT, patchCounters);
    window.addEventListener(STORY_REACTED_EVENT, patchCounters);
    window.addEventListener(STORY_REPLIED_EVENT, patchCounters);

    return () => {
      window.removeEventListener(STORY_CREATED_EVENT, reload);
      window.removeEventListener(STORY_DELETED_EVENT, reload);
      window.removeEventListener(STORY_VIEWED_EVENT, patchCounters);
      window.removeEventListener(STORY_REACTED_EVENT, patchCounters);
      window.removeEventListener(STORY_REPLIED_EVENT, patchCounters);
    };
  }, [loadStories]);

  return {
    storiesGroups,
    storiesLoading,
    storiesError,
    reloadStories: loadStories,
    setStoriesGroups,
  };
}
