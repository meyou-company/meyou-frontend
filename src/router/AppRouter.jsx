import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';

import AppBottomNav from '../components/AppBottomNav/AppBottomNav';
import { useAuthStore } from '../zustand/useAuthStore';
import HomePage from '../pages/HomeFeed/HomePage';
import Explore from '../pages/Explore/Explore';
import Friends from '../pages/Friends/Friends';
import Profile from '../pages/Profile/Profile';
import ProfileFriendsPage from '../pages/Profile/ProfileFriendsPage';
import VipChat from '../pages/VipChat/VipChat';

import LoginPage from '../pages/Auth/Login/LoginPage';
import RegisterPage from '../pages/Auth/Register/RegisterPage';
import VerifyEmailPage from '../pages/Auth/VerifyEmail/VerifyEmailPage';

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
import MyGiftsPage from "../pages/MyGifts/MyGiftsPage";
import ProfileGuard from './ProfileGuard';

import { UserProfileNavProvider } from "../context/UserProfileNavContext";
import BurgerMenu from '../components/BurgerMenu/BurgerMenu';
import { useBurgerMenuStore } from '../zustand/useBurgerMenuStore';
import { useThemeStore } from '../zustand/useThemeStore';


/** Глобальне бургер-меню — рендериться один раз, відкривається з будь-якої сторінки */
function GlobalBurgerMenu() {
  const isOpen = useBurgerMenuStore((s) => s.isOpen);
  const close = useBurgerMenuStore((s) => s.close);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  return <BurgerMenu isOpen={isOpen} onClose={close} toggleTheme={toggleTheme} />;
}

function AppLayout() {
  const location = useLocation();
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
              <Route path="/first-page" element={<FirstPage />} />
              <Route path="/wallet" element={<WalletPage />} />

              <Route path="/notifications" element={<NotificationsPage />} />

              <Route path="/my-gifts" element={<MyGiftsPage />} />

              <Route path="/video" element={<VideoPage />} />
              <Route path="/users/profile/complete" element={<CompleteProfilePage />} />
              <Route path="/users/profile/edit" element={<EditProfilePage />} />

              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />

              <Route path="/auth/verify-email" element={<VerifyEmailPage />} />

              <Route path="/auth/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/reset/verify-code" element={<VerifyResetCodePage />} />
              <Route path="/auth/reset/new-password" element={<ResetNewPasswordPage />} />

              <Route path="/auth/callback" element={<AuthCallback />} />
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
      <UserProfileNavProvider>
        <ProfileGuard>
          <GlobalBurgerMenu />
          <AppLayout />
        </ProfileGuard>
      </UserProfileNavProvider>
    </BrowserRouter>
  );
}
