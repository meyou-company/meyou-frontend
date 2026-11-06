import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../zustand/useAuthStore';
import { useFeedbackStore } from '../../zustand/useFeedbackStore';
import FeedbackModal from './FeedbackModal';
import './FeedbackWidget.scss';

export default function FeedbackWidget() {
  const location = useLocation();
  const navigate = useNavigate();
  const isOpen = useFeedbackStore((s) => s.isOpen);
  const open = useFeedbackStore((s) => s.open);
  const close = useFeedbackStore((s) => s.close);
  const fetchUnreadCount = useFeedbackStore((s) => s.fetchUnreadCount);
  const isAuthed = useAuthStore((s) => s.isAuthed);

  useEffect(() => {
    if (!isAuthed) return undefined;
    void fetchUnreadCount();
    const id = window.setInterval(() => {
      void fetchUnreadCount();
    }, 45000);
    return () => window.clearInterval(id);
  }, [isAuthed, fetchUnreadCount]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const feedbackId = params.get('feedback');
    if (!feedbackId || !isAuthed) return undefined;
    open({ feedbackId });
    params.delete('feedback');
    const next = params.toString();
    navigate(
      { pathname: location.pathname, search: next ? `?${next}` : '' },
      { replace: true },
    );
    return undefined;
  }, [location.search, location.pathname, isAuthed, open, navigate]);

  return <FeedbackModal isOpen={isOpen} onClose={close} />;
}
