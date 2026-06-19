import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { isPublicPath } from '../constants/publicRoutes';
import {
  dispatchStoryCreated,
  dispatchStoryDeleted,
  dispatchStoryReacted,
  dispatchStoryReplied,
  dispatchStoryViewed,
} from '../constants/storyEvents';
import { getSessionAccessToken } from '../services/api';
import { connectSocket } from '../services/socket';
import { useAuthStore } from '../zustand/useAuthStore';

export function StoriesSocketProvider() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const storeToken = useAuthStore((s) => s.token);
  const token = storeToken ?? getSessionAccessToken();
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const isAuthLoading = useAuthStore((s) => s.isAuthLoading);

  const canConnectSocket =
    !isAuthLoading &&
    isAuthed &&
    Boolean(user) &&
    Boolean(token) &&
    !isPublicPath(location.pathname);

  useEffect(() => {
    if (!canConnectSocket || !token) return;

    const socket = connectSocket(token);
    if (!socket) return;

    socket.on('story.created', dispatchStoryCreated);
    socket.on('story.deleted', dispatchStoryDeleted);
    socket.on('story.viewed', dispatchStoryViewed);
    socket.on('story.reacted', dispatchStoryReacted);
    socket.on('story.replied', dispatchStoryReplied);

    return () => {
      socket.off('story.created', dispatchStoryCreated);
      socket.off('story.deleted', dispatchStoryDeleted);
      socket.off('story.viewed', dispatchStoryViewed);
      socket.off('story.reacted', dispatchStoryReacted);
      socket.off('story.replied', dispatchStoryReplied);
    };
  }, [canConnectSocket, token]);

  return null;
}
