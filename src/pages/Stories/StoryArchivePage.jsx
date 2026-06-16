import { useNavigate } from 'react-router-dom';

import StoryArchiveView from '../../components/Stories/StoryArchive/StoryArchiveView';

export default function StoryArchivePage() {
  const navigate = useNavigate();

  return (
    <StoryArchiveView
      onBack={() => navigate(-1)}
      onGoProfile={() => navigate('/profile')}
      onGoExplore={() => navigate('/search')}
      onGoWallet={() => navigate('/wallet')}
      onGoVipChat={() => navigate('/vip-chat')}
      onGoHome={() => navigate('/first-page')}
    />
  );
}
