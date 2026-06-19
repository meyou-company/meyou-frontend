export function isMessageSeenByPeer(message, seenMessageIds) {
  if (!message?.id) return false;
  if (seenMessageIds?.has?.(String(message.id))) return true;
  return message.deliveryStatus === 'SEEN' || Boolean(message.readAt);
}

export function collectSeenOutgoingIds(messages, currentUserId) {
  const ids = new Set();
  if (!Array.isArray(messages) || !currentUserId) return ids;
  for (const m of messages) {
    if (String(m.senderId) !== String(currentUserId)) continue;
    if (m.deliveryStatus === 'SEEN' || m.readAt) {
      ids.add(String(m.id));
    }
  }
  return ids;
}

export function extractSeenTargetIds(envelope) {
  const ids = new Set();
  const add = (id) => {
    if (id != null && String(id).trim()) ids.add(String(id));
  };
  if (Array.isArray(envelope?.messageIds)) {
    envelope.messageIds.forEach(add);
  }
  add(envelope?.messageId);
  add(envelope?.message?.id);
  return ids;
}

export function markOutgoingSeenFromEnvelope(messages, envelope, currentUserId) {
  if (!currentUserId || !Array.isArray(messages)) return messages;

  const targetIds = extractSeenTargetIds(envelope);
  const hasAnchor = Boolean(envelope?.message?.id);
  if (targetIds.size === 0 && !hasAnchor) return messages;

  const readAt = envelope?.message?.readAt ?? envelope?.at ?? null;
  const anchorCreatedAt = envelope?.message?.createdAt
    ? new Date(envelope.message.createdAt).getTime()
    : null;

  return messages.map((m) => {
    if (String(m.senderId) !== String(currentUserId)) return m;
    if (m.deliveryStatus === 'SEEN' || m.readAt) return m;

    const byId = targetIds.has(String(m.id));
    let byTime = false;
    if (anchorCreatedAt != null && m.createdAt) {
      byTime = new Date(m.createdAt).getTime() <= anchorCreatedAt;
    }

    if (!byId && !byTime) return m;

    return {
      ...m,
      deliveryStatus: 'SEEN',
      readAt: m.readAt ?? readAt ?? new Date().toISOString(),
    };
  });
}

export function mergeSeenMessageIds(prevSet, envelope, messages, currentUserId) {
  const next = new Set(prevSet);
  extractSeenTargetIds(envelope).forEach((id) => next.add(id));
  if (Array.isArray(messages)) {
    for (const m of messages) {
      if (String(m.senderId) !== String(currentUserId)) continue;
      if (m.deliveryStatus === 'SEEN' || m.readAt) {
        next.add(String(m.id));
      }
    }
  }
  return next;
}
