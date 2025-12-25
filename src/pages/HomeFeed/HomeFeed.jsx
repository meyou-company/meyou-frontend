import { useNavigate } from "react-router-dom";
import { FaMoneyBillWave, FaComments, FaShieldAlt } from "react-icons/fa";

export default function HomeFeed() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-meyou-bg text-white flex items-center justify-center px-4">
      <div className="w-full max-w-[580px] flex flex-col items-center text-center pt-10 pb-14">

        {/* Logo block */}
        <div className="w-[300px] h-[300px] flex items-center justify-center rounded-2xl border border-white/15 
                        bg-white/5 backdrop-blur-sm shadow-[0_0_60px_rgba(176,92,255,0.15)] mb-10">
          <img
            src="/Logo/photo.jpeg"
            alt="Me You logo"
            className="w-[240px] h-auto object-contain"
          />
        </div>

        {/* Features (icons are links) */}
        <div className="w-full flex justify-between px-6 mb-12">
          <Feature
            icon={<FaMoneyBillWave />}
            title="Бонусы за друзей"
            onClick={() => navigate("/register")}
          />
          <Feature
            icon={<FaComments />}
            title="Современный чат"
            onClick={() => navigate("/login")}
          />
          <Feature
            icon={<FaShieldAlt />}
            title="Полная безопасность"
            onClick={() => navigate("/login")}
          />
        </div>

        {/* Buttons */}
        <div className="w-full flex flex-col items-center gap-5">
          <button
            onClick={() => navigate("/register")}
            className="btn-gradient !w-[260px] !py-3 !text-sm"
          >
            Создать аккаунт
          </button>

          <button
            onClick={() => navigate("/login")}
            className="btn-gradient !w-[260px] !py-3 !text-sm"
          >
            Войти
          </button>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-3 w-[150px] text-center 
                 text-white/60 hover:text-white transition"
    >
      <div className="text-2xl">
        {icon}
      </div>

      <span className="text-[12px] leading-4 whitespace-normal">
        {title}
      </span>
    </button>
  );
}
