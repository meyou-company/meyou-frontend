import { create } from 'zustand';
import { feedbackApi } from '../services/feedbackApi';

export const FEEDBACK_TYPES = [
  { id: 'SUGGESTION', emoji: '💡', labelKey: 'feedback.types.suggestion' },
  { id: 'BUG', emoji: '🐞', labelKey: 'feedback.types.bug' },
  { id: 'UNCLEAR', emoji: '😕', labelKey: 'feedback.types.unclear' },
  { id: 'REVIEW', emoji: '❤️', labelKey: 'feedback.types.review' },
];

export const FEEDBACK_STATUSES = [
  { id: 'NEW', labelKey: 'feedback.status.new' },
  { id: 'IN_PROGRESS', labelKey: 'feedback.status.inProgress' },
  { id: 'ANSWERED', labelKey: 'feedback.status.answered' },
  { id: 'CLOSED', labelKey: 'feedback.status.closed' },
];

export const useFeedbackStore = create((set) => ({
  isOpen: false,
  view: 'compose',
  selectedId: null,
  unreadCount: 0,

  open: (opts = {}) =>
    set({
      isOpen: true,
      view: opts.feedbackId ? 'detail' : opts.view || 'compose',
      selectedId: opts.feedbackId || null,
    }),
  close: () => set({ isOpen: false, view: 'compose', selectedId: null }),
  setView: (view, selectedId = null) => set({ view, selectedId }),
  setUnreadCount: (unreadCount) => set({ unreadCount: Number(unreadCount) || 0 }),
  fetchUnreadCount: async () => {
    try {
      const data = await feedbackApi.unreadCount();
      set({ unreadCount: Number(data?.count ?? 0) });
    } catch {
      /* ignore unauthenticated / network */
    }
  },
}));
