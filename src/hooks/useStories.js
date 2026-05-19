import { useEffect, useState } from "react";
import { getStoriesFeed } from "../services/storiesApi";

export function useStories() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const data = await getStoriesFeed();
    
      setStories(data || []);
    } catch (e) {
      console.error("stories error", e);
      setStories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  return {
    stories,
    setStories,
    loading,
    refresh: fetchStories,
  };
}