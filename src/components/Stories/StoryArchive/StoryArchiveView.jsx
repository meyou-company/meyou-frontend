import { i18n as translation } from "../../../i18n";
import { useTranslation } from "react-i18next";
import { LuArrowLeft } from 'react-icons/lu';

import AppHeader from '../../Layout/AppHeader';
import { useStoryArchive } from '../../../hooks/useStoryArchive';
import StoryArchiveCard from './StoryArchiveCard';
import './StoryArchive.scss';

export default function StoryArchiveView({
  onBack,
  onGoExplore,
  onGoHome,
  onGoProfile,
  onGoVipChat,
  onGoWallet,
}) {
  useTranslation();
  const { items, loading, loadingMore, meta, loadMore } = useStoryArchive();

  return (
    <div className="storyArchivePage">
      <AppHeader
        onGoProfile={onGoProfile}
        onGoExplore={onGoExplore}
        onGoWallet={onGoWallet}
        onGoVipChat={onGoVipChat}
        onGoHome={onGoHome}
      />

      <main className="storyArchivePage__content">
        <div className="storyArchivePage__head">
          <button type="button" onClick={onBack} aria-label={translation.t("uiText.back")}>
            <LuArrowLeft aria-hidden="true" />
          </button>
          <div>
            <h1>{translation.t("uiText.stories_archive")}</h1>
            <p>{translation.t("uiText.active_and_expired_stories_from_your_profile")}</p>
          </div>
        </div>

        {loading ? <p className="storyArchivePage__hint">{translation.t("uiText.loading")}</p> : null}

        {!loading && items.length === 0 ? (
          <p className="storyArchivePage__hint">{translation.t("uiText.no_archived_stories_yet")}</p>
        ) : null}

        <div className="storyArchivePage__grid">
          {items.map((story) => (
            <StoryArchiveCard key={story.id || story._id} story={story} />
          ))}
        </div>

        {meta.hasMore ? (
          <button
            type="button"
            className="storyArchivePage__more"
            disabled={loadingMore}
            onClick={loadMore}
          >
            {loadingMore ? translation.t("common.loading") : translation.t("uiText.load_more")}
          </button>
        ) : null}
      </main>
    </div>
  );
}
