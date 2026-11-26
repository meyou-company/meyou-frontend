import { lazyPage } from './lazyPage';

export const HomePage = lazyPage(
  () => import('../pages/HomeFeed/HomePage'),
  { moduleId: 'page-home' },
);
export const Explore = lazyPage(
  () => import('../pages/Explore/Explore'),
  { moduleId: 'page-explore' },
);
export const Friends = lazyPage(
  () => import('../pages/Friends/Friends'),
  { moduleId: 'page-friends' },
);
export const Profile = lazyPage(
  () => import('../pages/Profile/Profile'),
  { moduleId: 'page-profile' },
);
export const ProfileFriendsPage = lazyPage(
  () => import('../pages/Profile/ProfileFriendsPage'),
  { moduleId: 'page-profile-friends' },
);
export const ProfilePhotosPage = lazyPage(
  () => import('../pages/Profile/ProfilePhotosPage'),
  { moduleId: 'page-profile-photos' },
);
export const VipChat = lazyPage(
  () => import('../pages/VipChat/VipChat'),
  { moduleId: 'page-vip-chat' },
);
export const MessagesPage = lazyPage(
  () => import('../pages/Messages/MessagesPage'),
  { moduleId: 'page-messages' },
);
export const StoryArchivePage = lazyPage(
  () => import('../pages/Stories/StoryArchivePage'),
  { moduleId: 'page-stories-archive' },
);
export const LoginPage = lazyPage(
  () => import('../pages/Auth/Login/LoginPage'),
  { moduleId: 'page-login' },
);
export const RegisterPage = lazyPage(
  () => import('../pages/Auth/Register/RegisterPage'),
  { moduleId: 'page-register' },
);
export const VerifyEmailPage = lazyPage(
  () => import('../pages/Auth/VerifyEmail/VerifyEmailPage'),
  { moduleId: 'page-verify-email' },
);
export const GoogleOAuthSuccess = lazyPage(
  () => import('../pages/Auth/GoogleOAuthSuccess'),
  { moduleId: 'page-google-success' },
);
export const VerifyResetCodePage = lazyPage(
  () => import('../pages/Auth/VerifyEmail/VerifyResetCodePage'),
  { moduleId: 'page-verify-reset' },
);
export const AuthCallback = lazyPage(
  () => import('../pages/AuthCallback/AuthCallback'),
  { moduleId: 'page-auth-callback' },
);
export const ForgotPassword = lazyPage(
  () => import('../pages/Auth/ForgotPassword/ForgotPasswordPage'),
  { moduleId: 'page-forgot-password' },
);
export const ResetNewPasswordPage = lazyPage(
  () => import('../pages/Auth/ResetNewPassword/ResetNewPasswordPage'),
  { moduleId: 'page-reset-password' },
);
export const CompleteProfilePage = lazyPage(
  () => import('../pages/Users/Profile/CompleteProfilePage'),
  { moduleId: 'page-complete-profile' },
);
export const EditProfilePage = lazyPage(
  () => import('../pages/Users/Profile/EditProfilePage'),
  { moduleId: 'page-edit-profile' },
);
export const VideoPage = lazyPage(
  () => import('../pages/Video/VideoPage'),
  { moduleId: 'page-video' },
);
export const OopsPage = lazyPage(
  () => import('../pages/Oops/OopsPage'),
  { moduleId: 'page-oops' },
);
export const LivePage = lazyPage(
  () => import('../pages/Live/LivePage'),
  { moduleId: 'page-live' },
);
export const SavedPage = lazyPage(
  () => import('../pages/Saved/SavedPage'),
  { moduleId: 'page-saved' },
);
export const FirstPage = lazyPage(
  () => import('../pages/FirstPage/FirstPage'),
  { moduleId: 'page-first' },
);
export const WalletPage = lazyPage(
  () => import('../pages/Wallet/WalletPage'),
  { moduleId: 'page-wallet' },
);
export const NotificationsPage = lazyPage(
  () => import('../pages/Notifications/NotificationsPage'),
  { moduleId: 'page-notifications' },
);
export const MyGiftsPage = lazyPage(
  () => import('../pages/MyGifts/MyGiftsPage'),
  { moduleId: 'page-my-gifts' },
);
export const NotFoundPage = lazyPage(
  () => import('../pages/NotFound/NotFoundPage'),
  { moduleId: 'page-not-found' },
);
export const AccountSettingsPage = lazyPage(
  () => import('../pages/Settings/AccountSettingsPage'),
  { moduleId: 'page-settings-account' },
);
export const ChangePasswordPage = lazyPage(
  () => import('../pages/Settings/ChangePasswordPage'),
  { moduleId: 'page-settings-password' },
);
export const PrivacySettingsPage = lazyPage(
  () => import('../pages/Settings/PrivacySettingsPage'),
  { moduleId: 'page-settings-privacy' },
);
export const SecuritySettingsPage = lazyPage(
  () => import('../pages/Settings/SecuritySettingsPage'),
  { moduleId: 'page-settings-security' },
);
export const TwoFactorSettingsPage = lazyPage(
  () => import('../pages/Settings/TwoFactorSettingsPage'),
  { moduleId: 'page-settings-2fa' },
);
export const MfaVerifyPage = lazyPage(
  () => import('../pages/Auth/MfaVerifyPage'),
  { moduleId: 'page-mfa' },
);
export const BlockedUsersPage = lazyPage(
  () => import('../pages/Settings/BlockedUsersPage'),
  { moduleId: 'page-settings-blocked' },
);
export const VipAccessSettingsPage = lazyPage(
  () => import('../pages/Settings/VipAccessSettingsPage'),
  { moduleId: 'page-settings-vip' },
);
export const LegalPrivacyPage = lazyPage(
  () => import('../app/legal/privacy/page'),
  { moduleId: 'page-legal-privacy' },
);
export const LegalTermsPage = lazyPage(
  () => import('../app/legal/terms/page'),
  { moduleId: 'page-legal-terms' },
);
export const LegalCommunityGuidelinesPage = lazyPage(
  () => import('../app/legal/community-guidelines/page'),
  { moduleId: 'page-legal-community' },
);
export const LegalDeleteAccountPage = lazyPage(
  () => import('../app/legal/delete-account/page'),
  { moduleId: 'page-legal-delete' },
);
export const LegalAcceptTermsPage = lazyPage(
  () => import('../app/legal/accept-terms/page'),
  { moduleId: 'page-legal-accept' },
);
export const EarnPage = lazyPage(
  () => import('../app/earn/page'),
  { moduleId: 'page-earn' },
);
export const FeatureChatPage = lazyPage(
  () => import('../app/features/chat/page'),
  { moduleId: 'page-feature-chat' },
);
export const FeatureSecurityPage = lazyPage(
  () => import('../app/features/security/page'),
  { moduleId: 'page-feature-security' },
);
export const FeatureStoriesPage = lazyPage(
  () => import('../app/features/stories/page'),
  { moduleId: 'page-feature-stories' },
);
export const FeatureProfilePage = lazyPage(
  () => import('../app/features/profile/page'),
  { moduleId: 'page-feature-profile' },
);
export const FeatureGiftsPage = lazyPage(
  () => import('../app/features/gifts/page'),
  { moduleId: 'page-feature-gifts' },
);
export const AdminLayout = lazyPage(
  () => import('../pages/Admin/AdminLayout'),
  { moduleId: 'page-admin-layout' },
);
export const AdminDashboardPage = lazyPage(
  () => import('../pages/Admin/AdminDashboardPage'),
  { moduleId: 'page-admin-dashboard' },
);
export const AdminReportsPage = lazyPage(
  () => import('../pages/Admin/AdminReportsPage'),
  { moduleId: 'page-admin-reports' },
);
export const AdminFeedbackPage = lazyPage(
  () => import('../pages/Admin/AdminFeedbackPage'),
  { moduleId: 'page-admin-feedback' },
);
export const AdminUsersPage = lazyPage(
  () => import('../pages/Admin/AdminUsersPage'),
  { moduleId: 'page-admin-users' },
);
export const Post = lazyPage(
  () => import('../components/Post/Post'),
  { moduleId: 'page-post' },
);