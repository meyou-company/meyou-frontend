import { useEffect, useRef, useState } from 'react';
import { createStoryFilterRenderer } from '../utils/storyFilterRenderer';
import { getStoryFilterCss } from '../utils/storyFilters';
import { getStoryFaceRegions } from '../utils/storyFaceRegions';

function detectFace(image) {
  return new Promise((resolve) => {
    const worker = new Worker('/story-face-tracker.js');
    const finish = (regions) => { clearTimeout(timeout); worker.terminate(); resolve(regions); };
    const timeout = setTimeout(() => finish(null), 15000);
    worker.onerror = () => finish(null);
    worker.onmessage = async ({ data }) => {
      if (data.type === 'ready') {
        try {
          const frame = await createImageBitmap(image);
          worker.postMessage({ type: 'frame', frame, timestamp: performance.now() }, [frame]);
        } catch { finish(null); }
      } else if (data.type === 'result') finish(getStoryFaceRegions(data.landmarks));
      else if (data.type === 'error') finish(null);
    };
    worker.postMessage({ type: 'init' });
  });
}

export function useStoryPhotoFilter(item, filterId, intensity) {
  const faceCache = useRef(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  // Keep the displayed blob alive until React has committed its replacement.
  // Render-job cleanup also runs when a slider moves back to a previous value.
  useEffect(() => {
    const url = result?.url;
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [result?.url]);
  const source = item?.type === 'image' ? item.previewUrl : null;
  useEffect(() => {
    let cancelled = false;
    if (!source || !intensity) { setResult(null); setBusy(false); setError(null); return; }
    setBusy(true);
    setError(null);
    const image = new Image();
    image.onload = async () => {
      let renderer;
      try {
        if (filterId === 'beauty' && faceCache.current?.source !== source) {
          faceCache.current = { source, promise: detectFace(image) };
        }
        const regions = filterId === 'beauty' ? await faceCache.current.promise : null;
        if (cancelled) return;
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 1920 / Math.max(image.naturalWidth, image.naturalHeight));
        canvas.width = Math.round(image.naturalWidth * scale);
        canvas.height = Math.round(image.naturalHeight * scale);
        renderer = createStoryFilterRenderer(canvas);
        if (renderer) renderer.render(image, filterId, intensity / 100, false, regions);
        else {
          const fallback = document.createElement('canvas');
          fallback.width = canvas.width; fallback.height = canvas.height;
          const ctx = fallback.getContext('2d');
          ctx.filter = getStoryFilterCss(filterId, intensity / 100);
          ctx.drawImage(image, 0, 0, fallback.width, fallback.height);
          const blob = await new Promise(resolve => fallback.toBlob(resolve, 'image/png'));
          if (!blob) throw new Error('Filter encoding failed');
          if (!cancelled) { const url = URL.createObjectURL(blob); setResult({source, filterId, intensity, url, file: new File([blob], 'story-filtered.png', {type:'image/png'})}); }
          return;
        }
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Filter encoding failed');
        if (!cancelled) { const url = URL.createObjectURL(blob); setResult({source, filterId, intensity, url, file:new File([blob], 'story-filtered.png', {type:'image/png'})}); }
      } catch (e) { if (!cancelled) { setResult(null); setError(e); } }
      finally { renderer?.dispose({ releaseContext: true }); if (!cancelled) setBusy(false); }
    };
    image.onerror = () => { if (!cancelled) { setBusy(false); setError(new Error('Image load failed')); } };
    image.src = source;
    return () => { cancelled = true; };
  }, [source, filterId, intensity]);
  const matches = result?.source === source && result?.filterId === filterId && result?.intensity === intensity;
  return { result: matches ? result : null, busy: Boolean(source && intensity && (busy || (!matches && !error))), error };
}
