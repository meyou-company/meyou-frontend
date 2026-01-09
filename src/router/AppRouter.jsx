import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "../pages/HomeFeed/HomePage";
import Explore from "../pages/Explore/Explore";
import Friends from "../pages/Friends/Friends";
import Profile from "../pages/Profile/Profile";
import VipChat from "../pages/VipChat/VipChat";

import LoginPage from "../pages/Auth/Login/LoginPage";
import RegisterPage from "../pages/Auth/Register/RegisterPage";
import VerifyEmailPage from "../pages/Auth/VerifyEmail/VerifyEmailPage";
import VerifyResetCodePage from "../pages/Auth/VerifyEmail/VerifyResetCodePage";
import AuthCallback from "../pages/AuthCallback/AuthCallback";
import ForgotPassword from "../pages/Auth/ForgotPassword/ForgotPasswordPage";
import ResetNewPasswordPage from "../pages/Auth/ResetNewPassword/ResetNewPasswordPage";



export default function AppRouter() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <div className="app-page">
          <div className="app-container">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/vip-chat" element={<VipChat />} />

              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />
              <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
              <Route path="/auth/reset/verify-code" element={<VerifyResetCodePage />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/reset/new-password" element={<ResetNewPasswordPage />} />

            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}
