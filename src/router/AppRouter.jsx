import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomeFeedPage from "../pages/HomeFeed/HomePage";
import Explore from "../pages/Explore/Explore";
import Friends from "../pages/Friends/Friends";
import Profile from "../pages/Profile/Profile";
import VipChat from "../pages/VipChat/VipChat";

import LoginPage from "../pages/Auth/Login/LoginPage";
import RegisterPage from "../pages/Auth/Register/RegisterPage";
import VerifyEmailPage from "../pages/Auth/VerifyEmail/VerifyEmailPage";
import AuthCallback from "../pages/AuthCallback/AuthCallback";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <div className="app-page">
          <div className="app-container">
            <Routes>
              <Route path="/" element={<HomeFeedPage />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/vip-chat" element={<VipChat />} />

              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/auth/verify" element={<VerifyEmailPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}
