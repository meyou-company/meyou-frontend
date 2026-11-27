import { i18n as translation } from "../../../i18n";
import { useTranslation } from "react-i18next";
function getStoryMediaUrl(story) {
  return story?.mediaUrl || story?.media_url || story?.url || story?.media?.url || '';
}

function getStoryMediaType(story) {
  return String(story?.mediaType || story?.media_type || story?.type || 'image').toLowerCase();
}

function getStoryStatus(story) {
  if (story?.isActive === true) return 'uiText.active';
  if (story?.isExpired === true) return 'uiText.expired';
  return 'uiText.story';
}

export default function StoryArchiveCard({ story }) {
  const { t } = useTranslation();
  const mediaUrl = getStoryMediaUrl(story);
  const mediaType = getStoryMediaType(story);

  return (
    <article className="storyArchiveCard">
      <div className="storyArchiveCard__media">
        {mediaType === 'video' ? (
          <video src={mediaUrl} muted playsInline preload="metadata" />
        ) : (
          <img src={mediaUrl} alt="" />
        )}
        <span className={`storyArchiveCard__status ${story?.isExpired ? 'is-expired' : ''}`}>
          {t(getStoryStatus(story))}
        </span>
      </div>
      {story?.text ? <p className="storyArchiveCard__text">{story.text}</p> : null}
      <div className="storyArchiveCard__stats">
        <span>{story.viewsCount ?? 0} {translation.t("uiText.views")}</span>
        <span>{story.reactionsCount ?? 0} {translation.t("uiText.reactions")}</span>
        <span>{story.repliesCount ?? 0} {translation.t("uiText.replies")}</span>
        <span>{story.savesCount ?? 0} {translation.t("uiText.saves")}</span>
      </div>
    </article>
  );
}
