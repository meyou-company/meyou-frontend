import { lazy, Suspense } from 'react';

import OutgoingCallScreen from '../components/Calls/OutgoingCallScreen';
import { preloadCallRoomSessionModule } from '../utils/callRoomSessionLoader';

const ActiveCallOverlay = lazy(() => import('../components/Calls/ActiveCallOverlay'));
const GroupCallOverlay = lazy(() => import('../components/Calls/GroupCallOverlay'));

let preloadPromise = null;

/** Warm LiveKit overlay chunks + shared room module (incoming ring, restore, group join). */
export function preloadCallOverlayChunks() {
  if (!preloadPromise) {
    preloadPromise = Promise.all([
      import('../components/Calls/ActiveCallOverlay'),
      import('../components/Calls/GroupCallOverlay'),
      preloadCallRoomSessionModule(),
    ]).finally(() => {
      preloadPromise = null;
    });
  }
  return preloadPromise;
}

function OverlayChunkFallback({ call, mediaType, onCancel }) {
  if (!call) return null;
  return (
    <OutgoingCallScreen
      call={call}
      mediaType={mediaType}
      connectionStatus="connecting"
      onCancel={onCancel}
    />
  );
}

export function LazyActiveCallOverlay(props) {
  const { call, mediaType, onCancel } = props;
  return (
    <Suspense
      fallback={
        <OverlayChunkFallback
          call={call}
          mediaType={mediaType}
          onCancel={onCancel}
        />
      }
    >
      <ActiveCallOverlay {...props} />
    </Suspense>
  );
}

export function LazyGroupCallOverlay(props) {
  const { call, mediaType, onCancel } = props;
  return (
    <Suspense
      fallback={
        <OverlayChunkFallback
          call={call}
          mediaType={mediaType}
          onCancel={onCancel}
        />
      }
    >
      <GroupCallOverlay {...props} />
    </Suspense>
  );
}