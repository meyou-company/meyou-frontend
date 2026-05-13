import { useNavigate } from 'react-router-dom';

import Post from '../../components/Post/Post';

export default function PostPage() {
  const navigate = useNavigate();

  return (
    <Post
      onGoBack={() => {
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate('/profile');
        }
      }}
      onGoProfile={() => navigate('/profile')}
    />
  );
}
