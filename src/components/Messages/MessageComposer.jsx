import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuPaperclip } from 'react-icons/lu';
import { toast } from 'sonner';
import profileIcons from '../../constants/profileIcons';
import { useTypingEmitter } from '../../hooks/useTypingEmitter';
import {
  buildAttachmentFromFile,
  inferMessageTypeFromFile,
  uploadMessageMedia,
} from '../../services/messageMediaUploadApi';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import './MessageComposer.scss';

export default function MessageComposer({
  value,
  onChange,
  onSubmit,
  onSendPayload,
  sending = false,
  replyTo,
  onCancelReply,
  conversationId,
}) {
  const { t } = useTranslation();
  const { emitTyping, stopTyping } = useTypingEmitter(conversationId);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordChunksRef = useRef([]);

  const busy = sending || uploadingFile;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value?.trim() || busy) return;
    stopTyping();
    onSubmit?.();
  };

  const handleChange = (e) => {
    onChange?.(e.target.value);
    emitTyping();
  };

  const sendFile = async (file) => {
    if (!file || busy) return;
    try {
      setUploadingFile(true);
      const url = await uploadMessageMedia(file);
      const attachment = buildAttachmentFromFile(file, url);
      const type = inferMessageTypeFromFile(file);
      stopTyping();
      await onSendPayload?.({
        type,
        text: value?.trim() || undefined,
        attachments: [attachment],
      });
      if (value?.trim()) onChange?.('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'messenger.uploadError'));
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFilePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await sendFile(file);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const startRecording = async () => {
    if (busy || recording) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error(t('messenger.voiceNotSupported'));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data?.size) recordChunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(recordChunksRef.current, { type: 'audio/webm' });
        if (!blob.size) return;
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        await sendFile(file);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      toast.error(t('messenger.voicePermissionDenied'));
    }
  };

  const handleVoiceClick = () => {
    if (recording) {
      stopRecording();
    } else {
      void startRecording();
    }
  };

  return (
    <form className="msgComposer" onSubmit={handleSubmit}>
      {replyTo ? (
        <div className="msgComposer__replyPreview">
          <div className="msgComposer__replyMeta">
            <span className="msgComposer__replyLabel">{t('messenger.youReplied')}</span>
            <p className="msgComposer__replyText">{replyTo.text || t('messenger.attachmentPreview')}</p>
          </div>
          <button
            type="button"
            className="msgComposer__replyCancel"
            onClick={onCancelReply}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>
      ) : null}

      <div className="msgComposer__row">
        <div className="msgComposer__inputWrap">
          <input
            className="msgComposer__input"
            value={value}
            onChange={handleChange}
            onBlur={stopTyping}
            placeholder={t('messenger.placeholder')}
            maxLength={4000}
            disabled={busy}
            aria-label={t('messenger.placeholder')}
          />
          <button
            type="submit"
            className="msgComposer__send"
            disabled={busy || !value?.trim()}
            aria-label={t('messenger.composer.sendAria')}
          >
            <img src="/icon1/push.png" alt="" aria-hidden="true" />
          </button>
        </div>

        <div className="msgComposer__actions">
          <button
            type="button"
            className={`msgComposer__actionBtn${recording ? ' is-recording' : ''}`}
            onClick={handleVoiceClick}
            disabled={busy}
            aria-label={t('messenger.composer.voiceAria')}
          >
            <MicIcon />
          </button>
          <button
            type="button"
            className="msgComposer__actionBtn"
            onClick={() => cameraInputRef.current?.click()}
            disabled={busy}
            aria-label={t('messenger.composer.cameraAria')}
          >
            <img src={profileIcons.storyCamera} alt="" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="msgComposer__actionBtn"
            onClick={() => galleryInputRef.current?.click()}
            disabled={busy}
            aria-label={t('messenger.composer.galleryAria')}
          >
            <img src={profileIcons.storyGallery} alt="" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="msgComposer__actionBtn"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            aria-label={t('messenger.composer.fileAria')}
          >
            <LuPaperclip size={20} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {uploadingFile ? (
        <p className="msgComposer__uploadHint">{t('messenger.uploading')}</p>
      ) : null}

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,video/*"
        hidden
        onChange={handleFilePick}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleFilePick}
      />
      <input ref={fileInputRef} type="file" hidden onChange={handleFilePick} />
    </form>
  );
}

function MicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19 11a7 7 0 0 1-14 0M12 18v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
