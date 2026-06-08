import { REPOST_UI_VARIANT } from '../config/repostUiVariant';
import { isAuthorNameFeminine } from './postShareContext';
import { i18n } from '../i18n';

export function isRepostVariantA() {
  return REPOST_UI_VARIANT === 'A';
}

export function isRepostVariantB() {
  return REPOST_UI_VARIANT === 'B';
}

export function isRepostVariantC() {
  return REPOST_UI_VARIANT === 'C';
}

export function showRepostHeaderIcon() {
  return isRepostVariantA();
}

export function showRepostEmbedLabel() {
  return isRepostVariantB() || isRepostVariantC();
}

/** Variant B: shared label; C: in-feed label */
export function getRepostEmbedLabelText(author, t = i18n.t.bind(i18n)) {
  if (isRepostVariantB()) {
    return isAuthorNameFeminine(author)
      ? t('posts.repost.sharedFemale')
      : t('posts.repost.sharedMale');
  }
  if (isRepostVariantC()) return t('posts.repost.inFeed');
  return null;
}
