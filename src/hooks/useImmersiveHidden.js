import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useCallsStore } from "../zustand/useCallsStore";

const IMMERSIVE_SELECTORS = [
  ".storyViewer",
  ".storyUploadModal",
  ".videoPlayerModal",
  ".callOverlay",
  ".gift-box-overlay",
  ".msgMediaViewer",
  ".createPostModal",
].join(", ");

export function useImmersiveHidden() {
  const location = useLocation();
  const callPhase = useCallsStore((s) => s.phase);
  const [overlayHidden, setOverlayHidden] = useState(false);

  useEffect(() => {
    const tick = () => {
      setOverlayHidden(Boolean(document.querySelector(IMMERSIVE_SELECTORS)));
    };
    tick();
    const observer = new MutationObserver(tick);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [location.pathname]);

  const isLiveRoute = location.pathname.startsWith("/live");
  return callPhase !== "idle" || overlayHidden || isLiveRoute;
}
