import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LuCamera,
  LuRefreshCw,
  LuSlidersHorizontal,
  LuSquare,
  LuVideo,
  LuX,
} from 'react-icons/lu';
import { toast } from 'sonner';
import { STORY_FILTERS, getStoryFilterCss } from '../../utils/storyFilters';
import { createStoryFilterRenderer } from '../../utils/storyFilterRenderer';
import { getStoryFaceRegions } from '../../utils/storyFaceRegions';
import './StoryCamera.scss';

const MAX_RECORDING_SECONDS = 60;

function pickRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  return [
    'video/mp4;codecs=h264,aac',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ].find((type) => MediaRecorder.isTypeSupported?.(type)) || '';
}

function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Не вдалося створити фото'));
    }, type, quality);
  });
}

export default function StoryCamera({ onClose, onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(0);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const recordingStartedAtRef = useRef(0);
  const rendererRef = useRef(null);
  const rendererModeRef = useRef(null);
  const faceWorkerRef = useRef(null);
  const faceReadyRef = useRef(false);
  const faceBusyRef = useRef(false);
  const faceRegionsRef = useRef(null);
  const faceFrameAtRef = useRef(0);
  const faceResultAtRef = useRef(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [facingMode, setFacingMode] = useState('user');
  const [filterId, setFilterId] = useState('natural');
  const [intensity, setIntensity] = useState(70);
  const [showFilters, setShowFilters] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const filterCss = useMemo(
    () => getStoryFilterCss(filterId, intensity / 100),
    [filterId, intensity],
  );

  useEffect(() => {
    if (filterId !== 'beauty' || typeof createImageBitmap !== 'function') return;
    let disposed = false;
    const worker = new Worker(`${import.meta.env.BASE_URL}story-face-tracker.js`);
    faceWorkerRef.current = worker;
    faceReadyRef.current = false;
    faceBusyRef.current = false;
    let failedOnce = false;
    const failed = (error) => {
      if (disposed) return;
      console.error('[story-camera] Beauty failed', error);
      faceReadyRef.current = false;
      faceBusyRef.current = false;
      faceRegionsRef.current = null;
      worker.terminate();
      if (!failedOnce) toast.error('Не вдалося завантажити Beauty. Спробуйте вибрати його ще раз.');
      failedOnce = true;
    };
    worker.onmessage = ({ data }) => {
      if (disposed) return;
      if (data.type === 'ready') faceReadyRef.current = true;
      if (data.type === 'result') {
        faceBusyRef.current = false;
        const next = getStoryFaceRegions(data.landmarks);
        const previous = faceRegionsRef.current;
        // Dampen small tracking fluctuations without leaving a mask behind fast movement.
        const moved = next && previous && Math.hypot(next.face[0] - previous.face[0], next.face[1] - previous.face[1]) > next.face[2] * 0.3;
        faceRegionsRef.current = next && previous && !moved
          ? Object.fromEntries(Object.entries(next).map(([key, values]) => [
              key, values.map((value, index) => previous[key][index] * 0.25 + value * 0.75),
            ]))
          : next;
        faceResultAtRef.current = performance.now();
      }
      if (data.type === 'error') failed(data);
    };
    worker.onerror = failed;
    worker.postMessage({ type: 'init' });
    return () => {
      disposed = true;
      worker.terminate();
      faceWorkerRef.current = null;
      faceReadyRef.current = false;
      faceBusyRef.current = false;
      faceRegionsRef.current = null;
    };
  }, [filterId]);

  useEffect(() => {
    faceRegionsRef.current = null;
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animationRef.current);
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    rendererRef.current?.dispose?.();
    rendererRef.current = null;
    rendererModeRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      setIsReady(false);
      try {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        const videoConstraints = {
          facingMode: { ideal: facingMode },
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        };
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: true,
          });
        } catch {
          // A denied/unavailable microphone should not block taking photos.
          stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: false,
          });
        }
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setIsReady(true);
      } catch (error) {
        console.error('[story-camera] camera failed', error);
        toast.error('Не вдалося відкрити камеру. Перевірте дозвіл у браузері.');
        if (!cancelled) onCloseRef.current?.();
      }
    };

    void start();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [facingMode, stopCamera]);

  useEffect(() => {
    const draw = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video?.readyState >= 2 && canvas) {
        const now = performance.now();
        const worker = faceWorkerRef.current;
        if (filterId === 'beauty' && worker && faceReadyRef.current && !faceBusyRef.current && now - faceFrameAtRef.current >= 100) {
          faceFrameAtRef.current = now;
          faceBusyRef.current = true;
          createImageBitmap(video, { resizeWidth: 256, resizeHeight: Math.max(1, Math.round(256 * video.videoHeight / video.videoWidth)) })
            .then((frame) => {
              if (faceWorkerRef.current !== worker) {
                frame.close();
                return;
              }
              worker.postMessage({ type: 'frame', frame, timestamp: now }, [frame]);
            })
            .catch(() => { faceBusyRef.current = false; faceRegionsRef.current = null; });
        }
        const width = video.videoWidth || 720;
        const height = video.videoHeight || 1280;
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          rendererRef.current?.dispose?.();
          rendererRef.current = null;
          rendererModeRef.current = null;
        }
        if (!rendererModeRef.current) {
          rendererRef.current = createStoryFilterRenderer(canvas);
          rendererModeRef.current = rendererRef.current ? 'webgl' : '2d';
        }
        if (rendererRef.current) {
          rendererRef.current.render(
            video,
            filterId,
            intensity / 100,
            facingMode === 'user',
            filterId === 'beauty' && now - faceResultAtRef.current < 350 ? faceRegionsRef.current : null,
          );
        } else {
          const context = canvas.getContext('2d');
          if (!context) {
            animationRef.current = requestAnimationFrame(draw);
            return;
          }
          context.save();
          context.clearRect(0, 0, width, height);
          context.filter = filterId === 'beauty' ? 'none' : filterCss;
          if (facingMode === 'user') {
            context.translate(width, 0);
            context.scale(-1, 1);
          }
          context.drawImage(video, 0, 0, width, height);
          context.restore();
        }
      }
      animationRef.current = requestAnimationFrame(draw);
    };
    animationRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationRef.current);
  }, [facingMode, filterCss, filterId, intensity]);

  const capturePhoto = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !isReady || isRecording) return;
    try {
      const blob = await canvasToBlob(canvas);
      const file = new File([blob], `story-${Date.now()}.jpg`, {
        type: blob.type || 'image/jpeg',
        lastModified: Date.now(),
      });
      onCapture?.(file, { filterBaked: true });
    } catch (error) {
      toast.error(error?.message || 'Не вдалося зробити фото');
    }
  };

  const finishRecording = useCallback(() => {
    clearInterval(timerRef.current);
    const recorder = recorderRef.current;
    if (recorder?.state === 'recording') recorder.stop();
  }, []);

  const startRecording = () => {
    const canvas = canvasRef.current;
    if (!canvas || !isReady || isRecording) return;
    if (!canvas.captureStream) {
      toast.error('Запис обробленого відео не підтримується цим браузером');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      toast.error('Запис відео не підтримується цим браузером');
      return;
    }

    try {
      const outputStream = canvas.captureStream(30);
      streamRef.current?.getAudioTracks().forEach((track) => outputStream.addTrack(track));
      const mimeType = pickRecorderMimeType();
      const recorder = new MediaRecorder(
        outputStream,
        mimeType ? { mimeType, videoBitsPerSecond: 5_000_000 } : undefined,
      );
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => toast.error('Не вдалося записати відео');
      recorder.onstop = () => {
        clearInterval(timerRef.current);
        const type = recorder.mimeType || mimeType || 'video/webm';
        const blob = new Blob(chunksRef.current, { type });
        const extension = type.includes('mp4') ? 'mp4' : 'webm';
        const durationSec = Math.max(
          1,
          Math.min(MAX_RECORDING_SECONDS, Math.ceil((Date.now() - recordingStartedAtRef.current) / 1000)),
        );
        setIsRecording(false);
        setRecordingSeconds(0);
        if (!blob.size) return;
        onCapture?.(
          new File([blob], `story-${Date.now()}.${extension}`, {
            type,
            lastModified: Date.now(),
          }),
          { durationSec, filterBaked: true },
        );
      };
      recordingStartedAtRef.current = Date.now();
      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        const seconds = Math.floor((Date.now() - recordingStartedAtRef.current) / 1000);
        setRecordingSeconds(seconds);
        if (seconds >= MAX_RECORDING_SECONDS) finishRecording();
      }, 250);
    } catch (error) {
      console.error('[story-camera] recording failed', error);
      toast.error('Не вдалося почати запис відео');
    }
  };

  const handleClose = () => {
    if (isRecording) finishRecording();
    stopCamera();
    onClose?.();
  };

  return (
    <div className="storyCamera">
      <video ref={videoRef} className="storyCamera__source" playsInline muted />
      <canvas ref={canvasRef} className="storyCamera__preview" aria-label="Попередній перегляд камери" />

      <div className="storyCamera__topBar">
        <button type="button" className="storyCamera__roundBtn" onClick={handleClose} aria-label="Закрити камеру">
          <LuX />
        </button>
        {isRecording ? <span className="storyCamera__timer">00:{String(recordingSeconds).padStart(2, '0')}</span> : null}
        <button
          type="button"
          className="storyCamera__roundBtn"
          onClick={() => setFacingMode((value) => (value === 'user' ? 'environment' : 'user'))}
          disabled={isRecording}
          aria-label="Перемкнути камеру"
        >
          <LuRefreshCw />
        </button>
      </div>

      <div className="storyCamera__bottom">
        {showFilters ? (
          <div className="storyCamera__filtersPanel">
            <div className="storyCamera__filters" role="listbox" aria-label="Фільтри">
              {STORY_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={`storyCamera__filter${filter.id === filterId ? ' is-active' : ''}`}
                  onClick={() => setFilterId(filter.id)}
                  role="option"
                  aria-selected={filter.id === filterId}
                  disabled={isRecording}
                >
                  <span className="storyCamera__filterSwatch" style={{ background: filter.swatch }} />
                  <span>{filter.label}</span>
                </button>
              ))}
            </div>
            <label className="storyCamera__intensity">
              <span>Інтенсивність</span>
              <input
                type="range"
                min="0"
                max="100"
                value={intensity}
                onChange={(event) => setIntensity(event.target.value)}
                disabled={isRecording}
              />
              <output>{intensity}%</output>
            </label>
          </div>
        ) : null}

        <div className="storyCamera__controls">
          <button
            type="button"
            className={`storyCamera__filterToggle${showFilters ? ' is-active' : ''}`}
            onClick={() => setShowFilters((value) => !value)}
            disabled={isRecording}
          >
            <LuSlidersHorizontal />
            <span>Фільтри</span>
          </button>
          <button
            type="button"
            className="storyCamera__shutter"
            onClick={capturePhoto}
            disabled={!isReady || isRecording}
            aria-label="Зробити фото"
          >
            <LuCamera />
          </button>
          <button
            type="button"
            className={`storyCamera__record${isRecording ? ' is-recording' : ''}`}
            onClick={isRecording ? finishRecording : startRecording}
            disabled={!isReady}
            aria-label={isRecording ? 'Зупинити запис' : 'Записати відео'}
          >
            {isRecording ? <LuSquare /> : <LuVideo />}
          </button>
        </div>
      </div>
    </div>
  );
}

