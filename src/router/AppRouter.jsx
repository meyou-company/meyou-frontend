import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "../pages/HomeFeed/HomePage";
import Explore from "../pages/Explore/Explore";
import Friends from "../pages/Friends/Friends";
import Profile from "../pages/Profile/Profile";
import VipChat from "../pages/VipChat/VipChat";

import LoginPage from "../pages/Auth/Login/LoginPage";
import RegisterPage from "../pages/Auth/Register/RegisterPage";
import VerifyEmailPage from "../pages/Auth/VerifyEmail/VerifyEmailPage";

// ✅ перенесли reset verify в окрему папку ResetPassword
import VerifyResetCodePage from "../pages/Auth/VerifyEmail/VerifyResetCodePage";

import AuthCallback from "../pages/AuthCallback/AuthCallback";
import ForgotPassword from "../pages/Auth/ForgotPassword/ForgotPasswordPage";

import ResetNewPasswordPage from "../pages/Auth/ResetNewPassword/ResetNewPasswordPage";

import CompleteProfilePage from "../pages/Users/Profile/CompleteProfilePage";
import EditProfilePage from "../pages/Users/Profile/EditProfilePage";

import FirstPage from "../pages/FirstPage/FirstPage";
import WalletPage from "../pages/Wallet/WalletPage";

import ProfileGuard from "./ProfileGuard";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <ProfileGuard>
        <div className="app-shell">
          <div className="app-page">
            <div className="app-container">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/search" element={<Explore />} />
                <Route path="/friends" element={<Friends />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/vip-chat" element={<VipChat />} />
                <Route path="/first-page" element={<FirstPage />} />
                <Route path="/wallet" element={<WalletPage />} />

                <Route
                  path="/users/profile/complete"
                  element={<CompleteProfilePage />}
                />
                <Route path="/users/profile/edit" element={<EditProfilePage />} />

                <Route path="/auth/login" element={<LoginPage />} />
                <Route path="/auth/register" element={<RegisterPage />} />

                {/* ✅ register verify */}
                <Route path="/auth/verify-email" element={<VerifyEmailPage />} />

                {/* ✅ reset flow */}
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                <Route
                  path="/auth/reset/verify-code"
                  element={<VerifyResetCodePage />}
                />
                <Route
                  path="/auth/reset/new-password"
                  element={<ResetNewPasswordPage />}
                />

                <Route path="/auth/callback" element={<AuthCallback />} />
              </Routes>
            </div>
          </div>
        </div>
      </ProfileGuard>
    </BrowserRouter>
  );
}