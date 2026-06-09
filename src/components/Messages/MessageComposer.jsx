import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuPaperclip } from 'react-icons/lu';
import { toast } from 'sonner';
import EmojiPickerButton from '../EmojiPicker/EmojiPickerButton';
import profileIcons from '../../constants/profileIcons';
import { useTypingEmitter } from '../../hooks/useTypingEmitter';
import {
  buildAttachmentFromFile,
  inferMessageTypeFromFile,
  uploadMessageMedia,
} from '../../services/messageMediaUploadApi';
import { resolveFileMime } from '../../utils/messageAttachmentMedia';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import MessageComposerAttachmentPreview from './MessageComposerAttachmentPreview';
import './MessageComposer.scss';

function createPendingAttachment(file) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const mime = resolveFileMime(file);
  let previewUrl = null;
  if (mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/')) {
    previewUrl = URL.createObjectURL(file);
  }
  return { id, file, previewUrl };
}

export default function MessageComposer({
  value,
  onChange,
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
  const inputRef = useRef(null);
  const inputWrapRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const mediaRecorderRef = useRef(null);
  const recordChunksRef = useRef([]);

  const busy = sending || uploadingFile;
  const hasText = Boolean((value ?? '').trim());
  const hasPending = pendingAttachments.length > 0;
  const canSend = (hasText || hasPending) && !busy;

  const clearPendingAttachments = useCallback((items) => {
    for (const item of items) {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    }
  }, []);

  const resetPendingAttachments = useCallback(() => {
    setPendingAttachments((prev) => {
      clearPendingAttachments(prev);
      return [];
    });
  }, [clearPendingAttachments]);

  useEffect(() => {
    resetPendingAttachments();
    return () => resetPendingAttachments();
  }, [conversationId, resetPendingAttachments]);

  const addPendingFiles = useCallback((files) => {
    if (!files?.length) return;
    const next = Array.from(files).map(createPendingAttachment);
    setPendingAttachments((prev) => [...prev, ...next]);
  }, []);

  const removePendingAttachment = useCallback((id) => {
    setPendingAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSend) return;

    stopTyping();

    const text = value?.trim() || '';
    const snapshot = [...pendingAttachments];

    try {
      setUploadingFile(true);
      const attachments = [];
      for (const item of snapshot) {
        const url = await uploadMessageMedia(item.file);
        attachments.push(buildAttachmentFromFile(item.file, url));
      }

      const type = attachments.length
        ? inferMessageTypeFromFile(snapshot[0].file)
        : 'TEXT';

      await onSendPayload?.({
        type,
        text: text || undefined,
        attachments: attachments.length ? attachments : undefined,
      });

      resetPendingAttachments();
      if (text) onChange?.('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'messenger.uploadError'));
    } finally {
      setUploadingFile(false);
    }
  };

  const handleChange = (e) => {
    onChange?.(e.target.value);
    emitTyping();
  };

  const handleEmojiChange = useCallback(
    (nextValue) => {
      onChange?.(nextValue);
      emitTyping();
    },
    [onChange, emitTyping],
  );

  const handleFileSelect = (source) => (e) => {
    const files = e.target.files;
    if (files?.length) {
      addPendingFiles(files);
    }
    e.target.value = '';
  };

  const openFileInput = (inputRef) => {
    inputRef.current?.click();
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
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(recordChunksRef.current, { type: 'audio/webm' });
        if (!blob.size) return;
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        addPendingFiles([file]);
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

      <MessageComposerAttachmentPreview
        items={pendingAttachments}
        onRemove={removePendingAttachment}
        disabled={busy}
      />

      <div className="msgComposer__row">
        <div ref={inputWrapRef} className="msgComposer__inputWrap">
          <input
            ref={inputRef}
            className="msgComposer__input"
            value={value ?? ''}
            onChange={handleChange}
            onBlur={stopTyping}
            placeholder={t('messenger.placeholder')}
            maxLength={4000}
            disabled={busy}
            aria-label={t('messenger.placeholder')}
          />
          <div className="msgComposer__inputActions">
            <EmojiPickerButton
              inputRef={inputRef}
              value={value ?? ''}
              onChange={handleEmojiChange}
              variant="inline"
              popoverContainerRef={inputWrapRef}
              pickerClassName="emojiPickerPopup"
              closeOnSelect
              className="msgComposer__emojiBtn"
              ariaLabel={t('messenger.composer.addEmoji')}
            />
            <button
              type="submit"
              className="msgComposer__send"
              disabled={!canSend}
              aria-label={t('messenger.composer.sendAria')}
            >
              <img src="/icon1/push.png" alt="" aria-hidden="true" />
            </button>
          </div>
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
            onClick={() => openFileInput(cameraInputRef)}
            disabled={busy}
            aria-label={t('messenger.composer.cameraAria')}
          >
            <img src={profileIcons.storyCamera} alt="" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="msgComposer__actionBtn"
            onClick={() => openFileInput(galleryInputRef)}
            disabled={busy}
            aria-label={t('messenger.composer.galleryAria')}
          >
            <img src={profileIcons.storyGallery} alt="" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="msgComposer__actionBtn"
            onClick={() => openFileInput(fileInputRef)}
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

      <div className="msgComposer__fileInputs" aria-hidden="true">
        <input
          ref={cameraInputRef}
          type="file"
          className="msgComposer__fileInput"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect('camera')}
        />
        <input
          ref={galleryInputRef}
          type="file"
          className="msgComposer__fileInput"
          accept="image/*"
          multiple
          onChange={handleFileSelect('gallery')}
        />
        <input
          ref={fileInputRef}
          type="file"
          className="msgComposer__fileInput"
          accept="*/*"
          multiple
          onChange={handleFileSelect('file')}
        />
      </div>
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
