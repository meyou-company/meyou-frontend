import { api, apiPath } from './api';

/**
 * @returns {Promise<{
 *   deliveryUrl: string;
 *   expiresAt: string;
 *   expiresInSeconds: number;
 *   refreshAfterSeconds: number;
 *   accessControl: 'auth_token' | 'signed_static';
 *   cdnEnforcesExpiry: boolean;
 *   attachmentId: string;
 *   conversationId: string;
 *   mimeType?: string;
 *   fileName?: string | null;
 *   assetKey?: string;
 * }>}
 */
export async function fetchChatAttachmentDelivery(conversationId, attachmentId) {
  const { data } = await api.get(
    apiPath(
      `/conversations/${encodeURIComponent(conversationId)}/attachments/${encodeURIComponent(attachmentId)}/delivery`,
    ),
  );
  return data;
}