/**
 * Dev-only Messages page performance diagnostics (no PII).
 * Enable: VITE_PERF_MESSAGES_DIAG=1 in .env.local (development build only).
 */

const SUMMARY_KEY = 'messagesPagePerf';

let activeSession = null;

export function isMessagesPagePerfDiagEnabled() {
  return (
    import.meta.env.DEV && import.meta.env.VITE_PERF_MESSAGES_DIAG === '1'
  );
}

export function beginMessagesPagePerfSession() {
  if (!isMessagesPagePerfDiagEnabled()) return null;
  activeSession = {
    startedAtMs: performance.now(),
    authWaitMs: null,
    conversationListRequestCount: 0,
    conversationListDurationsMs: [],
    firstTenChatsMs: null,
    mountRequestCount: 0,
  };
  performance.mark(`${SUMMARY_KEY}:session-start`);
  return activeSession;
}

export function noteMessagesAuthReady() {
  if (!activeSession) return;
  const elapsed = Math.round(performance.now() - activeSession.startedAtMs);
  activeSession.authWaitMs = elapsed;
  performance.mark(`${SUMMARY_KEY}:auth-ready`);
}

export function bumpMessagesPageMountRequest() {
  if (!activeSession) return;
  activeSession.mountRequestCount += 1;
}

export function noteConversationListFetchStart() {
  if (!activeSession) return;
  activeSession.conversationListRequestCount += 1;
  activeSession._listFetchStart = performance.now();
  bumpMessagesPageMountRequest();
}

export function noteConversationListFetchEnd() {
  if (!activeSession || activeSession._listFetchStart == null) return;
  const duration = Math.round(performance.now() - activeSession._listFetchStart);
  activeSession.conversationListDurationsMs.push(duration);
  activeSession._listFetchStart = null;
  performance.mark(`${SUMMARY_KEY}:list-fetch-end`);
}

export function noteFirstConversationsRendered(rowCount) {
  if (!activeSession || activeSession.firstTenChatsMs != null) return;
  if (rowCount < 1) return;
  activeSession.firstTenChatsMs = Math.round(
    performance.now() - activeSession.startedAtMs,
  );
  performance.mark(`${SUMMARY_KEY}:first-rows`);
}

export function flushMessagesPagePerfReport(reason = 'unmount') {
  if (!activeSession) return;
  const payload = {
    event: 'perf_messages_page',
    reason,
    auth_wait_ms: activeSession.authWaitMs,
    conversation_list_requests: activeSession.conversationListRequestCount,
    conversation_list_durations_ms: activeSession.conversationListDurationsMs,
    first_ten_chats_ms: activeSession.firstTenChatsMs,
    mount_parallel_request_count: activeSession.mountRequestCount,
    total_session_ms: Math.round(performance.now() - activeSession.startedAtMs),
  };
  // eslint-disable-next-line no-console
  console.info(JSON.stringify(payload));
  activeSession = null;
}