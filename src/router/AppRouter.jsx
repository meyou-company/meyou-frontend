import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';

import AppBottomNav from '../components/AppBottomNav/AppBottomNav';
import RouterLoaderSync from '../components/RouterLoaderSync';
import { useAuthStore } from '../zustand/useAuthStore';
import HomePage from '../pages/HomeFeed/HomePage';
import Explore from '../pages/Explore/Explore';
import Friends from '../pages/Friends/Friends';
import Profile from '../pages/Profile/Profile';
import ProfileFriendsPage from '../pages/Profile/ProfileFriendsPage';
import VipChat from '../pages/VipChat/VipChat';
import MessagesPage from '../pages/Messages/MessagesPage';

import LoginPage from '../pages/Auth/Login/LoginPage';
import RegisterPage from '../pages/Auth/Register/RegisterPage';
import VerifyEmailPage from '../pages/Auth/VerifyEmail/VerifyEmailPage';
import GoogleOAuthSuccess from '../pages/Auth/GoogleOAuthSuccess';

import VerifyResetCodePage from '../pages/Auth/VerifyEmail/VerifyResetCodePage';

import AuthCallback from '../pages/AuthCallback/AuthCallback';
import ForgotPassword from '../pages/Auth/ForgotPassword/ForgotPasswordPage';
import ResetNewPasswordPage from '../pages/Auth/ResetNewPassword/ResetNewPasswordPage';

import CompleteProfilePage from '../pages/Users/Profile/CompleteProfilePage';
import EditProfilePage from '../pages/Users/Profile/EditProfilePage';
import VideoPage from '../pages/Video/VideoPage';

import FirstPage from '../pages/FirstPage/FirstPage';
import WalletPage from '../pages/Wallet/WalletPage';
import NotificationsPage from '../pages/Notifications/NotificationsPage';
import MyGiftsPage from '../pages/MyGifts/MyGiftsPage';
import NotFoundPage from '../pages/NotFound/NotFoundPage';
import ProfileGuard from './ProfileGuard';

import { UserProfileNavProvider } from '../context/UserProfileNavContext';
import BurgerMenu from '../components/BurgerMenu/BurgerMenu';
import LanguageSettings from '../components/Settings/LanguageSettings';
import AccountSettingsPage from '../pages/Settings/AccountSettingsPage';
import ChangePasswordPage from '../pages/Settings/ChangePasswordPage';
import PrivacySettingsPage from '../pages/Settings/PrivacySettingsPage';
import SecuritySettingsPage from '../pages/Settings/SecuritySettingsPage';
import { useBurgerMenuStore } from '../zustand/useBurgerMenuStore';
import { useLocaleStore } from '../zustand/useLocaleStore';
import { useThemeStore } from '../zustand/useThemeStore';
import Post from '../components/Post/Post';
import { MessagesSocketProvider } from '../providers/MessagesSocketProvider';
import { NotificationsSocketProvider } from '../providers/NotificationsSocketProvider';

/** Глобальне бургер-меню — рендериться один раз, відкривається з будь-якої сторінки */
function GlobalBurgerMenu() {
  const isOpen = useBurgerMenuStore((s) => s.isOpen);
  const close = useBurgerMenuStore((s) => s.close);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isLanguageSettingsOpen = useLocaleStore((s) => s.isLanguageSettingsOpen);
  const openLanguageSettings = useLocaleStore((s) => s.openLanguageSettings);
  const closeLanguageSettings = useLocaleStore((s) => s.closeLanguageSettings);

  return (
    <>
      <BurgerMenu
        isOpen={isOpen}
        onClose={close}
        toggleTheme={toggleTheme}
        onOpenLanguageSettings={openLanguageSettings}
      />
      {isLanguageSettingsOpen && <LanguageSettings onClose={closeLanguageSettings} />}
    </>
  );
}

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const isAuthed = useAuthStore((s) => s.isAuthed);

  const isAuthRoute =
    location.pathname.startsWith('/auth') || location.pathname === '/auth/callback';
  const hideBottomNavRoutes = new Set(['/users/profile/complete']);
  const isLanding = location.pathname === '/';
  /** Нижня навігація (mobile): лише після завершення профілю, не на головній з входом/реєстрацією. */
  const profileComplete = user?.profileCompleted === true;
  const shouldHideBottomNav =
    isAuthRoute ||
    hideBottomNavRoutes.has(location.pathname) ||
    !isAuthed ||
    !user ||
    !profileComplete ||
    isLanding;
  const showBottomNav = !shouldHideBottomNav;

  return (
    <>
      <div className="app-shell">
        <div className="app-page">
          <div className={`app-container${showBottomNav ? ' app-container--has-bottom-nav' : ''}`}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<Explore />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:username" element={<Profile />} />
              <Route path="/profile/:username/friends" element={<ProfileFriendsPage />} />
              <Route path="/vip-chat" element={<VipChat />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/messages/:conversationId" element={<MessagesPage />} />
              <Route path="/first-page" element={<FirstPage />} />
              <Route path="/wallet" element={<WalletPage />} />

              <Route path="/notifications" element={<NotificationsPage />} />
              <Route
                path="/post/:postId"
                element={
                  <Post
                    onGoBack={() => navigate(-1)}
                    onGoProfile={(username) => navigate(`/profile/${username}`)}
                  />
                }
              />

              <Route path="/my-gifts" element={<MyGiftsPage />} />

              <Route path="/video" element={<VideoPage />} />
              <Route path="/users/profile/complete" element={<CompleteProfilePage />} />
              <Route path="/users/profile/edit" element={<EditProfilePage />} />

              <Route path="/settings/account" element={<AccountSettingsPage />} />
              <Route path="/settings/change-password" element={<ChangePasswordPage />} />
              <Route path="/settings/privacy" element={<PrivacySettingsPage />} />
              <Route path="/settings/security" element={<SecuritySettingsPage />} />

              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />

              <Route path="/auth/verify-email" element={<VerifyEmailPage />} />

              <Route path="/auth/google/success" element={<GoogleOAuthSuccess />} />

              <Route path="/auth/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/reset/verify-code" element={<VerifyResetCodePage />} />
              <Route path="/auth/reset/new-password" element={<ResetNewPasswordPage />} />

              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
        </div>
      </div>
      {showBottomNav && <AppBottomNav />}
    </>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <NotificationsSocketProvider />
      <MessagesSocketProvider />
      <RouterLoaderSync />
      <UserProfileNavProvider>
        <ProfileGuard>
          <GlobalBurgerMenu />
          <AppLayout />
        </ProfileGuard>
      </UserProfileNavProvider>
    </BrowserRouter>
  );
}
