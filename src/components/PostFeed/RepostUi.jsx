import profileIcons from "../../constants/profileIcons";
import {
  getRepostEmbedLabelText,
  isRepostVariantB,
  showRepostHeaderIcon,
  showRepostEmbedLabel,
} from "../../utils/repostUi";
import "./RepostUi.scss";

/** Іконка репосту (два стрілки), не share-стрілка */
export function RepostGlyph({ className = "" }) {
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

/** Variant A: маленька іконка репосту біля автора / часу */
export function RepostHeaderIcon({ className = "" }) {
  if (!showRepostHeaderIcon()) return null;

  const aria = "Поширений допис";

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

/** Variants B / C: тонкий підпис над вкладеним дописом */
export function RepostEmbedLabel({ author }) {
  const text = getRepostEmbedLabelText(author);
  if (!showRepostEmbedLabel() || !text) return null;

  return (
    <p className="postRepostLabel" aria-label={text}>
      {isRepostVariantB() ? <RepostGlyph className="postRepostLabel__icon" /> : null}
      <span>{text}</span>
    </p>
  );
}
