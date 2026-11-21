import { useState } from 'react';
import { isSec009ChatPrivateDeliveryEnabled } from '../../config/sec009ChatDelivery';
import ChatAttachmentMedia from './ChatAttachmentMedia';
import MediaViewerModal from './MediaViewerModal';
import './MessageAttachments.scss';

export default function MessageAttachments({
  attachments = [],
  isMine = false,
  messageType,
  conversationId,
}) {
  const [viewerMedia, setViewerMedia] = useState(null);
  const protectedDeliveryEnabled = isSec009ChatPrivateDeliveryEnabled();

  if (!attachments?.length) return null;

  const openViewer = (e, media) => {
    e.preventDefault();
    e.stopPropagation();
    setViewerMedia(media);
  };

  const closeViewer = () => setViewerMedia(null);

  return (
    <>
      <div className="msgAttachments">
        {attachments.map((rawAtt) => {
          const key = rawAtt.id || rawAtt.url;
          return (
            <ChatAttachmentMedia
              key={key}
              rawAtt={rawAtt}
              messageType={messageType}
              conversationId={conversationId}
              isMine={isMine}
              protectedDeliveryEnabled={protectedDeliveryEnabled}
              onOpenViewer={openViewer}
            />
          );
        })}
      </div>

      <MediaViewerModal
        isOpen={Boolean(viewerMedia)}
        media={viewerMedia}
        onClose={closeViewer}
      />
    </>
  );
}