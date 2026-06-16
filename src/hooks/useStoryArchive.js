import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { storiesApi } from '../services/storiesApi';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';

const ARCHIVE_LIMIT = 20;

export function useStoryArchive() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: ARCHIVE_LIMIT, hasMore: false, nextCursor: null });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadArchive = useCallback(async ({ page = 1, cursor, append = false } = {}) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const response = await storiesApi.getArchive({ page, cursor, limit: ARCHIVE_LIMIT });
      setItems((prev) => (append ? [...prev, ...response.data] : response.data));
      setMeta(response.meta);
    } catch (error) {
      console.error('[story-archive] failed', error);
      toast.error(getApiErrorMessage(error) || 'Could not load story archive');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadArchive();
  }, [loadArchive]);

  const loadMore = useCallback(() => {
    if (!meta.hasMore || loadingMore) return;

    loadArchive({
      page: (meta.page || 1) + 1,
      cursor: meta.nextCursor,
      append: true,
    });
  }, [loadArchive, loadingMore, meta.hasMore, meta.nextCursor, meta.page]);

  return {
    items,
    loading,
    loadingMore,
    meta,
    loadMore,
  };
}
