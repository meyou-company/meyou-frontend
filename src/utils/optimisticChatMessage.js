export function isOptimisticMessageId(id) {
  return String(id || '').startsWith('optimistic-');
}

export function deliveryRank(status) {
  if (status === 'SEEN') return 3;
  if (status === 'DELIVERED') return 2;
  if (status === 'SENT') return 1;
  return 0;
}

export function pickDeliveryStatus(current, incoming) {
  return deliveryRank(incoming) >= deliveryRank(current) ? incoming : current;
}

export function mergeMessageRecord(current, incoming) {
  return {
    ...current,
    ...incoming,
    pending: incoming.pending ?? false,
    sendFailed: incoming.sendFailed ?? false,
    deliveryStatus: pickDeliveryStatus(current?.deliveryStatus, incoming?.deliveryStatus),
    readAt: incoming.readAt || current?.readAt || null,
    clientId: incoming.clientId || current?.clientId,
  };
}

export function createClientId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createOptimisticMessage({
  clientId,
  conversationId,
  senderId,
  sender,
  payload,
  replyTo,
}) {
  const now = new Date().toISOString();
  return {
    id: `optimistic-${clientId}`,
    clientId,
    conversationId,
    senderId,
    type: payload?.type || 'TEXT',
    text: payload?.text || '',
    metadata: null,
    replyToMessageId: replyTo?.id ?? null,
    replyTo: replyTo
      ? {
          id: replyTo.id,
          senderId: replyTo.senderId,
          type: replyTo.type,
          text: replyTo.text,
          deleted: Boolean(replyTo.deletedForEveryone),
        }
      : null,
    forwardedFromId: null,
    forwardedFrom: null,
    attachments: Array.isArray(payload?.attachments) ? payload.attachments : [],
    reactions: [],
    isRead: false,
    readAt: null,
    deliveryStatus: 'SENT',
    editedAt: null,
    deletedForEveryone: false,
    createdAt: now,
    sender: sender
      ? {
          id: sender.id,
          username: sender.username,
          firstName: sender.firstName,
          lastName: sender.lastName,
          avatarUrl: sender.avatarUrl,
          name: sender.name,
        }
      : null,
    pending: true,
    sendFailed: false,
  };
}

export function mergeOutgoingMessage(prev, optimisticId, created) {
  if (!created?.id) return prev;

  const createdId = String(created.id);
  const optId = String(optimisticId);
  const clientId = created.clientId != null ? String(created.clientId) : '';
  const confirmedBase = { ...created, pending: false, sendFailed: false };

  const next = [];
  const seenIds = new Set();

  for (const message of prev) {
    const id = String(message.id);
    const isOptimistic =
      id === optId || (clientId && String(message.clientId) === clientId);

    if (isOptimistic) {
      if (!seenIds.has(createdId)) {
        next.push(mergeMessageRecord(message, confirmedBase));
        seenIds.add(createdId);
      }
      continue;
    }

    if (id === createdId) {
      if (!seenIds.has(createdId)) {
        next.push(mergeMessageRecord(message, confirmedBase));
        seenIds.add(createdId);
      }
      continue;
    }

    next.push(message);
    seenIds.add(id);
  }

  if (!seenIds.has(createdId)) {
    next.push(confirmedBase);
  }

  return next;
}

export function markOptimisticFailed(prev, optimisticId) {
  return prev.map((message) =>
    String(message.id) === String(optimisticId)
      ? { ...message, pending: false, sendFailed: true }
      : message,
  );
}
