function getStoryMediaUrl(story) {
  return story?.mediaUrl || story?.media_url || story?.url || story?.media?.url || '';
}

function getStoryMediaType(story) {
  return String(story?.mediaType || story?.media_type || story?.type || 'image').toLowerCase();
}

function getStoryStatus(story) {
  if (story?.isActive === true) return 'Active';
  if (story?.isExpired === true) return 'Expired';
  return 'Story';
}

export default function StoryArchiveCard({ story }) {
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
          {getStoryStatus(story)}
        </span>
      </div>
      {story?.text ? <p className="storyArchiveCard__text">{story.text}</p> : null}
      <div className="storyArchiveCard__stats">
        <span>{story.viewsCount ?? 0} views</span>
        <span>{story.reactionsCount ?? 0} reactions</span>
        <span>{story.repliesCount ?? 0} replies</span>
        <span>{story.savesCount ?? 0} saves</span>
      </div>
    </article>
  );
}
