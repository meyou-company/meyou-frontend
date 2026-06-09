import { useTranslation } from 'react-i18next';
import profileIcons from '../../constants/profileIcons';
import {
  getRepostEmbedLabelText,
  isRepostVariantB,
  showRepostHeaderIcon,
  showRepostEmbedLabel,
} from '../../utils/repostUi';
import './RepostUi.scss';

export function RepostGlyph({ className = '' }) {
  return (
    <img
      src={profileIcons.repost}
      alt=""
      className={`postRepostIcon__img ${className}`.trim()}
      width={14}
      height={14}
      decoding="async"
      draggable={false}
    />
  );
}

export function RepostHeaderIcon({ className = '' }) {
  const { t } = useTranslation();

  if (!showRepostHeaderIcon()) return null;

  const aria = t('posts.repost.sharedAria');

  return (
    <span
      className={`postRepostIcon ${className}`.trim()}
      aria-label={aria}
      title={aria}
    >
      <RepostGlyph />
    </span>
  );
}

export function RepostEmbedLabel({ author }) {
  const { t } = useTranslation();
  const text = getRepostEmbedLabelText(author, t);
  if (!showRepostEmbedLabel() || !text) return null;

  return (
    <p className="postRepostLabel" aria-label={text}>
      {isRepostVariantB() ? <RepostGlyph className="postRepostLabel__icon" /> : null}
      <span>{text}</span>
    </p>
  );
}
