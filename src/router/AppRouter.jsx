import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate, useParams } from 'react-router-dom';

import AppBottomNav from '../components/AppBottomNav/AppBottomNav';
import RouterLoaderSync from '../components/RouterLoaderSync';
import RouteChunkFallback from './RouteChunkFallback';
import { useAuthStore } from '../zustand/useAuthStore';
import ProfileGuard from './ProfileGuard';
import * as LazyPages from './lazyPages';

import { UserProfileNavProvider } from '../context/UserProfileNavContext';
import BurgerMenu from '../components/BurgerMenu/BurgerMenu';
import LanguageSettings from '../components/Settings/LanguageSettings';
import { useBurgerMenuStore } from '../zustand/useBurgerMenuStore';
import { useLocaleStore } from '../zustand/useLocaleStore';
import { useThemeStore } from '../zustand/useThemeStore';
import { useStoriesOverlayStore } from '../zustand/useStoriesOverlayStore';
import FeedbackWidget from '../components/Feedback/FeedbackWidget';
import LunaWidget from '../components/Luna/LunaWidget';
import { MessagesSocketProvider } from '../providers/MessagesSocketProvider';
import { NotificationsSocketProvider } from '../providers/NotificationsSocketProvider';
import { PresenceSocketProvider } from '../providers/PresenceSocketProvider';
import { StoriesSocketProvider } from '../providers/StoriesSocketProvider';
import { CallsProvider } from '../providers/CallsProvider';
import { GiftInboxProvider } from '../providers/GiftInboxProvider';
import { resolveProfileUsername } from '../utils/profileUsername';

function LegacyPostShareRedirect() {
  const { postId } = useParams();
  return <Navigate to={`/post/${encodeURIComponent(postId ?? '')}`} replace />;
}

function PostRoute() {
  const navigate = useNavigate();
  return (
    <LazyPages.Post
      onGoBack={() => navigate(-1)}
      onGoProfile={(value) => {
        const username = resolveProfileUsername(value);
        if (username) navigate(`/profile/${encodeURIComponent(username)}`);
      }}
    />
  );
}

/** Глобальне бургер-меню — рендериться один раз, відкривається з будь-якої сторінки */
function GlobalBurgerMenu() {
  const storiesOverlayActive = useStoriesOverlayStore((s) => s.isActive);
  const isOpen = useBurgerMenuStore((s) => s.isOpen);
  const close = useBurgerMenuStore((s) => s.close);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isLanguageSettingsOpen = useLocaleStore((s) => s.isLanguageSettingsOpen);
  const openLanguageSettings = useLocaleStore((s) => s.openLanguageSettings);
  const closeLanguageSettings = useLocaleStore((s) => s.closeLanguageSettings);

  if (storiesOverlayActive) return null;

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

  const user = useAuthStore((s) => s.user);
  const isAuthed = useAuthStore((s) => s.isAuthed);

  const isAuthRoute =
    location.pathname.startsWith('/auth') || location.pathname === '/auth/callback';
  const isLegalRoute = location.pathname.startsWith('/legal');
  const isFeatureRoute =
    location.pathname.startsWith('/features') || location.pathname === '/earn';
  const hideBottomNavRoutes = new Set(['/users/profile/complete']);
  const isLanding = location.pathname === '/';
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isLiveRoute = location.pathname.startsWith('/live');
  const storiesOverlayActive = useStoriesOverlayStore((s) => s.isActive);
  /** Нижня навігація (mobile): лише після завершення профілю, не на головній з входом/реєстрацією. */
  const profileComplete = user?.profileCompleted === true;
  const shouldHideBottomNav =
    isAuthRoute ||
    isLegalRoute ||
    isFeatureRoute ||
    isAdminRoute ||
    isLiveRoute ||
    storiesOverlayActive ||
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
            <Suspense fallback={<RouteChunkFallback />}>
              <Routes>
                <Route path="/" element={<LazyPages.HomePage />} />
                <Route path="/search" element={<LazyPages.Explore />} />
                <Route path="/friends" element={<LazyPages.Friends />} />
                <Route path="/profile" element={<LazyPages.Profile />} />
                <Route path="/profile/photos" element={<LazyPages.ProfilePhotosPage />} />
                <Route path="/profile/:username/photos" element={<LazyPages.ProfilePhotosPage />} />
                <Route path="/profile/:username" element={<LazyPages.Profile />} />
                <Route path="/profile/:username/friends" element={<LazyPages.ProfileFriendsPage />} />
                <Route path="/vip-chat" element={<LazyPages.VipChat />} />
                <Route path="/messages" element={<LazyPages.MessagesPage />} />
                <Route path="/messages/:conversationId" element={<LazyPages.MessagesPage />} />
                <Route path="/stories/archive" element={<LazyPages.StoryArchivePage />} />
                <Route path="/first-page" element={<LazyPages.FirstPage />} />
                <Route path="/wallet" element={<LazyPages.WalletPage />} />

                <Route path="/notifications" element={<LazyPages.NotificationsPage />} />
                <Route path="/posts/:postId" element={<LegacyPostShareRedirect />} />
                <Route path="/post/:postId" element={<PostRoute />} />

                <Route path="/my-gifts" element={<LazyPages.MyGiftsPage />} />

                <Route path="/video" element={<LazyPages.VideoPage />} />
                <Route path="/live/:liveId?" element={<LazyPages.LivePage />} />
                <Route path="/saved" element={<LazyPages.SavedPage />} />
                <Route path="/saved/collections/:collectionId" element={<LazyPages.SavedPage />} />
                <Route path="/about" element={<LazyPages.AboutPage />} />
                <Route path="/oops" element={<LazyPages.OopsPage />} />
                <Route path="/users/profile/complete" element={<LazyPages.CompleteProfilePage />} />
                <Route path="/users/profile/edit" element={<LazyPages.EditProfilePage />} />

                <Route path="/settings/account" element={<LazyPages.AccountSettingsPage />} />
                <Route path="/settings/vip-access" element={<LazyPages.VipAccessSettingsPage />} />
                <Route path="/settings/change-password" element={<LazyPages.ChangePasswordPage />} />
                <Route path="/settings/privacy" element={<LazyPages.PrivacySettingsPage />} />
                <Route path="/settings/security" element={<LazyPages.SecuritySettingsPage />} />
                <Route path="/settings/security/two-factor" element={<LazyPages.TwoFactorSettingsPage />} />
                <Route path="/settings/blocked" element={<LazyPages.BlockedUsersPage />} />

                <Route path="/admin" element={<LazyPages.AdminLayout />}>
                  <Route index element={<LazyPages.AdminDashboardPage />} />
                  <Route path="feedback" element={<LazyPages.AdminFeedbackPage />} />
                  <Route path="reports" element={<LazyPages.AdminReportsPage />} />
                  <Route path="users" element={<LazyPages.AdminUsersPage />} />
                </Route>

                <Route path="/legal/privacy" element={<LazyPages.LegalPrivacyPage />} />
                <Route path="/legal/terms" element={<LazyPages.LegalTermsPage />} />
                <Route path="/legal/community-guidelines" element={<LazyPages.LegalCommunityGuidelinesPage />} />
                <Route path="/legal/delete-account" element={<LazyPages.LegalDeleteAccountPage />} />
                <Route path="/legal/accept-terms" element={<LazyPages.LegalAcceptTermsPage />} />

                <Route path="/earn" element={<LazyPages.EarnPage />} />
                <Route path="/features/chat" element={<LazyPages.FeatureChatPage />} />
                <Route path="/features/stories" element={<LazyPages.FeatureStoriesPage />} />
                <Route path="/features/gifts" element={<LazyPages.FeatureGiftsPage />} />
                <Route path="/features/profile" element={<LazyPages.FeatureProfilePage />} />
                <Route path="/features/security" element={<LazyPages.FeatureSecurityPage />} />

                <Route path="/auth/login" element={<LazyPages.LoginPage />} />
                <Route path="/auth/register" element={<LazyPages.RegisterPage />} />

                <Route path="/auth/verify-email" element={<LazyPages.VerifyEmailPage />} />

                <Route path="/auth/google/success" element={<LazyPages.GoogleOAuthSuccess />} />
                <Route path="/auth/mfa" element={<LazyPages.MfaVerifyPage />} />

                <Route path="/auth/forgot-password" element={<LazyPages.ForgotPassword />} />
                <Route path="/auth/reset/verify-code" element={<LazyPages.VerifyResetCodePage />} />
                <Route path="/auth/reset/new-password" element={<LazyPages.ResetNewPasswordPage />} />

                <Route path="/auth/callback" element={<LazyPages.AuthCallback />} />
                <Route path="*" element={<LazyPages.NotFoundPage />} />
              </Routes>
            </Suspense>
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
      <GiftInboxProvider />
      <MessagesSocketProvider />
      <StoriesSocketProvider />
      <PresenceSocketProvider />
      <CallsProvider />
      <RouterLoaderSync />
      <UserProfileNavProvider>
        <ProfileGuard>
          <GlobalBurgerMenu />
          <FeedbackWidget />
          <LunaWidget />
          <AppLayout />
        </ProfileGuard>
      </UserProfileNavProvider>
    </BrowserRouter>
  );
}