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
          <button type="button" onClick={onBack} aria-label="Back">
            <LuArrowLeft aria-hidden="true" />
          </button>
          <div>
            <h1>Stories archive</h1>
            <p>Active and expired stories from your profile</p>
          </div>
        </div>

        {loading ? <p className="storyArchivePage__hint">Loading...</p> : null}

        {!loading && items.length === 0 ? (
          <p className="storyArchivePage__hint">No archived stories yet</p>
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
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        ) : null}
      </main>
    </div>
  );
}
