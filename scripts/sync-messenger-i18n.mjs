/**
 * Merges messenger i18n into all locale JSON files.
 * Run: node scripts/sync-messenger-i18n.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, '../src/i18n/locales');

const extraEn = {
  deletedMessage: 'Message deleted',
  edited: 'edited',
  typing: '{{name}} is typing…',
  repliedTo: 'Replied',
  forwarded: 'Forwarded',
  attachmentPreview: 'Attachment',
  attachmentFile: 'File',
  searchInChat: 'Search in chat',
  searchInChatPlaceholder: 'Search messages…',
  searchNoResults: 'No messages found',
  pinned: 'Pinned message',
  pinSuccess: 'Message pinned',
  unpinSuccess: 'Message unpinned',
  deleteSuccess: 'Message deleted',
  muteChat: 'Mute conversation',
  unmuteChat: 'Unmute conversation',
  muteSuccess: 'Conversation muted',
  unmuteSuccess: 'Conversation unmuted',
  uploading: 'Uploading…',
  uploadError: 'Upload failed',
  voiceNotSupported: 'Voice recording is not supported in this browser',
  voicePermissionDenied: 'Microphone access denied',
  forward: {
    title: 'Forward to',
    noChats: 'No other chats available',
    success: 'Message forwarded',
  },
  report: {
    title: 'Report message',
    reasonLabel: 'Reason',
    reasonPlaceholder: 'Describe the issue…',
    submit: 'Submit report',
    success: 'Report submitted',
  },
  edit: {
    title: 'Edit message',
    success: 'Message updated',
  },
  translate: {
    notAvailable: 'Translation is not available yet',
  },
  menu: {
    edit: 'Edit',
    unpin: 'Unpin',
  },
  composer: {
    fileAria: 'Attach file',
  },
};

const messengerUk = {
  title: 'Повідомлення',
  search: 'Пошук',
  soundLabel: '🔔 Звук повідомлень:',
  soundAria: 'Звук повідомлень',
  muteSound: 'Вимкнути звук',
  unmuteSound: 'Увімкнути звук',
  loadChatsError: 'Не вдалося завантажити чати',
  noChats: 'Чатів поки немає',
  selectChat: 'Оберіть чат зліва або почніть переписку з профілю користувача.',
  loadMessagesError: 'Не вдалося завантажити повідомлення',
  sendError: 'Не вдалося надіслати повідомлення',
  noMessages: 'Немає повідомлень',
  placeholder: 'Повідомлення',
  newMessageFrom: 'Нове повідомлення від {{name}}',
  dateToday: 'Сьогодні',
  dateYesterday: 'Вчора',
  youReplied: 'Ви відповіли',
  copySuccess: 'Скопійовано',
  comingSoon: 'Незабаром',
  backToChats: 'До списку чатів',
  deletedMessage: 'Повідомлення видалено',
  edited: 'змінено',
  typing: '{{name}} друкує…',
  repliedTo: 'Відповідь',
  forwarded: 'Переслано',
  attachmentPreview: 'Вкладення',
  attachmentFile: 'Файл',
  searchInChat: 'Пошук у чаті',
  searchInChatPlaceholder: 'Шукати повідомлення…',
  searchNoResults: 'Повідомлень не знайдено',
  pinned: 'Закріплене повідомлення',
  pinSuccess: 'Повідомлення закріплено',
  unpinSuccess: 'Повідомлення відкріплено',
  deleteSuccess: 'Повідомлення видалено',
  muteChat: 'Вимкнути сповіщення чату',
  unmuteChat: 'Увімкнути сповіщення чату',
  muteSuccess: 'Чат вимкнено',
  unmuteSuccess: 'Чат увімкнено',
  uploading: 'Завантаження…',
  uploadError: 'Не вдалося завантажити',
  voiceNotSupported: 'Запис голосу не підтримується',
  voicePermissionDenied: 'Немає доступу до мікрофона',
  menu: {
    reply: 'Відповісти',
    forward: 'Переслати',
    copy: 'Копіювати',
    translate: 'Перекласти',
    pin: 'Закріпити',
    edit: 'Редагувати',
    unpin: 'Відкріпити',
    deleteForMe: 'Видалити у вас',
    deleteForAll: 'Видалити у всіх',
    report: 'Поскаржитись',
  },
  reactions: { aria: 'Реакції на повідомлення' },
  composer: {
    voiceAria: 'Голосове повідомлення',
    cameraAria: 'Камера',
    galleryAria: 'Галерея',
    fileAria: 'Прикріпити файл',
    sendAria: 'Надіслати',
  },
  forward: {
    title: 'Переслати',
    noChats: 'Немає інших чатів',
    success: 'Повідомлення переслано',
  },
  report: {
    title: 'Скарга на повідомлення',
    reasonLabel: 'Причина',
    reasonPlaceholder: 'Опишіть проблему…',
    submit: 'Надіслати скаргу',
    success: 'Скаргу надіслано',
  },
  edit: {
    title: 'Редагувати повідомлення',
    success: 'Повідомлення оновлено',
  },
  translate: { notAvailable: 'Переклад поки недоступний' },
};

const messengerEn = {
  title: 'Messages',
  search: 'Search',
  soundLabel: '🔔 Message sound:',
  soundAria: 'Message sound',
  muteSound: 'Mute',
  unmuteSound: 'Unmute',
  loadChatsError: 'Could not load chats',
  noChats: 'No chats yet',
  selectChat: 'Select a chat on the left or start a conversation from a user profile.',
  loadMessagesError: 'Could not load messages',
  sendError: 'Could not send message',
  noMessages: 'No messages',
  placeholder: 'Message',
  newMessageFrom: 'New message from {{name}}',
  dateToday: 'Today',
  dateYesterday: 'Yesterday',
  youReplied: 'You replied',
  copySuccess: 'Copied',
  comingSoon: 'Coming soon',
  backToChats: 'Back to chats',
  ...extraEn,
  menu: {
    reply: 'Reply',
    forward: 'Forward',
    copy: 'Copy',
    translate: 'Translate',
    pin: 'Pin',
    edit: 'Edit',
    unpin: 'Unpin',
    deleteForMe: 'Delete for you',
    deleteForAll: 'Delete for everyone',
    report: 'Report',
  },
  reactions: { aria: 'Message reactions' },
  composer: {
    voiceAria: 'Voice message',
    cameraAria: 'Camera',
    galleryAria: 'Gallery',
    fileAria: 'Attach file',
    sendAria: 'Send',
  },
};

const messengerRu = {
  title: 'Сообщения',
  search: 'Поиск',
  soundLabel: '🔔 Звук сообщений:',
  soundAria: 'Звук сообщений',
  muteSound: 'Выключить звук',
  unmuteSound: 'Включить звук',
  loadChatsError: 'Не удалось загрузить чаты',
  noChats: 'Чатов пока нет',
  selectChat: 'Выберите чат слева или начните переписку из профиля пользователя.',
  loadMessagesError: 'Не удалось загрузить сообщения',
  sendError: 'Не удалось отправить сообщение',
  noMessages: 'Нет сообщений',
  placeholder: 'Сообщение',
  newMessageFrom: 'Новое сообщение от {{name}}',
  dateToday: 'Сегодня',
  dateYesterday: 'Вчера',
  youReplied: 'Вы ответили',
  copySuccess: 'Скопировано',
  comingSoon: 'Скоро',
  backToChats: 'К списку чатов',
  deletedMessage: 'Сообщение удалено',
  edited: 'изменено',
  typing: '{{name}} печатает…',
  repliedTo: 'Ответ',
  forwarded: 'Переслано',
  attachmentPreview: 'Вложение',
  attachmentFile: 'Файл',
  searchInChat: 'Поиск в чате',
  searchInChatPlaceholder: 'Искать сообщения…',
  searchNoResults: 'Сообщения не найдены',
  pinned: 'Закреплённое сообщение',
  pinSuccess: 'Сообщение закреплено',
  unpinSuccess: 'Сообщение откреплено',
  deleteSuccess: 'Сообщение удалено',
  muteChat: 'Отключить уведомления чата',
  unmuteChat: 'Включить уведомления чата',
  muteSuccess: 'Чат отключён',
  unmuteSuccess: 'Чат включён',
  uploading: 'Загрузка…',
  uploadError: 'Не удалось загрузить',
  voiceNotSupported: 'Запись голоса не поддерживается',
  voicePermissionDenied: 'Нет доступа к микрофону',
  menu: {
    reply: 'Ответить',
    forward: 'Переслать',
    copy: 'Копировать',
    translate: 'Перевести',
    pin: 'Закрепить',
    edit: 'Редактировать',
    unpin: 'Открепить',
    deleteForMe: 'Удалить у вас',
    deleteForAll: 'Удалить у всех',
    report: 'Пожаловаться',
  },
  reactions: { aria: 'Реакции на сообщение' },
  composer: {
    voiceAria: 'Голосовое сообщение',
    cameraAria: 'Камера',
    galleryAria: 'Галерея',
    fileAria: 'Прикрепить файл',
    sendAria: 'Отправить',
  },
  forward: {
    title: 'Переслать',
    noChats: 'Нет других чатов',
    success: 'Сообщение переслано',
  },
  report: {
    title: 'Жалоба на сообщение',
    reasonLabel: 'Причина',
    reasonPlaceholder: 'Опишите проблему…',
    submit: 'Отправить жалобу',
    success: 'Жалоба отправлена',
  },
  edit: {
    title: 'Редактировать сообщение',
    success: 'Сообщение обновлено',
  },
  translate: { notAvailable: 'Перевод пока недоступен' },
};

function deepMerge(target, source) {
  const out = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = deepMerge(out[key] || {}, value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

const localeOverrides = {
  uk: messengerUk,
  en: messengerEn,
  ru: messengerRu,
  tr: messengerEn,
  fr: messengerEn,
  cs: messengerEn,
  es: messengerEn,
  ar: messengerEn,
};

for (const locale of Object.keys(localeOverrides)) {
  const filePath = path.join(localesDir, `${locale}.json`);
  const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  existing.messenger = deepMerge(existing.messenger || {}, localeOverrides[locale]);
  fs.writeFileSync(filePath, `${JSON.stringify(existing, null, 2)}\n`);
  console.log('updated', locale);
}
