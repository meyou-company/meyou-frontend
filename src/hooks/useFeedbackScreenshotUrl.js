import { useEffect, useState } from 'react';
import { adminApi } from '../services/adminApi';
import { feedbackApi } from '../services/feedbackApi';

export function useFeedbackScreenshotUrl(feedbackId, hasScreenshot, { admin = false } = {}) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!feedbackId || !hasScreenshot) {
      setUrl(null);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    const load = admin
      ? adminApi.getFeedbackScreenshotDelivery(feedbackId)
      : feedbackApi.getScreenshotDelivery(feedbackId);
    load
      .then((data) => {
        if (!cancelled) setUrl(data?.url || null);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [feedbackId, hasScreenshot, admin]);

  return { url, loading };
}