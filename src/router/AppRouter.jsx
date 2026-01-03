import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomeFeed from "../pages/HomeFeed/HomeFeed";
import Explore from "../pages/Explore/Explore";
import Friends from "../pages/Friends/Friends";
import Profile from "../pages/Profile/Profile";
import VipChat from "../pages/VipChat/VipChat";
import Login from "../pages/Auth/Login";
import Register from "../pages/Auth/Register";
import AuthCallback from "../pages/AuthCallback/AuthCallback";
export default function AppRouter() {
  return (
    <BrowserRouter>
      <div className="app-shell">
      <div className="app-page">
        <div className="app-container">
       
      <Routes>
        <Route path="/" element={<HomeFeed />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/vip-chat" element={<VipChat />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

      </Routes>
    
      </div></div>
      </div>
    </BrowserRouter>
  );
}
